import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../data-source';
import { User, UserActivity, SmtpConfiguration, EmailTracking, LandingPage } from '../entities';
import { authenticateJWT } from '../middleware/auth';
import { validateSmtpConfig, validateAndProcessFile } from '../utils/smtp';
import multer from 'multer';
import { emailService } from '../services/emailService';

const router = Router();

// Auth
router.post('/auth/register', async (req, res) => {
  try {
    const { name, fullName, email, password, company } = req.body || {};
    const resolvedName = name || fullName;
    if (!resolvedName || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }
    const userRepo = AppDataSource.getRepository(User);
    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = userRepo.create({ name: resolvedName, email, password: hashed, company, role: 'user', status: 'active' });
    const saved = await userRepo.save(user);
    const token = jwt.sign({ id: saved.id, email: saved.email }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
    return res.status(201).json({ success: true, token, user: { id: saved.id, name: saved.name, email: saved.email, role: saved.role, company: saved.company } });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    user.lastLogin = new Date();
    await userRepo.save(user);
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
    return res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company } });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

router.post('/auth/verify-2fa', (_req, res) => res.json({ success: true }));
router.post('/auth/setup-2fa', (_req, res) => res.json({ success: true }));
router.post('/auth/disable-2fa', (_req, res) => res.json({ success: true }));

// Users (protected)
router.get('/users/profile', authenticateJWT, async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: (req.user as any).id } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ id: user.id, name: user.name, email: user.email, role: user.role, company: (user as any).company });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
});

router.get('/users/activities', authenticateJWT, async (_req, res) => {
  const repo = AppDataSource.getRepository(UserActivity);
  const list = await repo.find({ order: { timestamp: 'DESC' }, take: 100 });
  return res.json(list);
});

router.post('/users/activities', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(UserActivity);
  let body: any = req.body;
  try {
    if (typeof body === 'string') body = JSON.parse(body);
  } catch {
    // if parsing fails, keep as string
  }
  const description = typeof body === 'string' ? body : (body?.description || 'Activity');
  const act = repo.create({ description, metadata: body?.metadata || {}, user: req.user! });
  const saved = await repo.save(act);
  return res.json(saved);
});

router.post('/users/change-password', authenticateJWT, async (req, res) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  const newPassword = req.body?.newPassword || req.body?.password;
  if (!newPassword) return res.status(400).json({ success: false, error: 'New password required' });
  user.password = await bcrypt.hash(newPassword, 12);
  await userRepo.save(user);
  return res.json({ success: true });
});

// SMTP
router.get('/smtp/configs', authenticateJWT, async (_req, res) => {
  const repo = AppDataSource.getRepository(SmtpConfiguration);
  const configs = await repo.find({ order: { createdAt: 'DESC' } });
  return res.json(configs);
});

router.post('/smtp/configs', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(SmtpConfiguration);
  const cfg = repo.create({ ...req.body, userId: req.user!.id, isActive: true, isValid: false, status: 'inactive' });
  const saved = await repo.save(cfg);
  return res.status(201).json(saved);
});

router.patch('/smtp/configs/:id', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(SmtpConfiguration);
  const cfg = await repo.findOne({ where: { id: req.params.id } });
  if (!cfg) return res.status(404).json({ success: false, error: 'Not found' });
  Object.assign(cfg, req.body || {});
  const saved = await repo.save(cfg);
  return res.json({ success: true, configuration: saved });
});

router.delete('/smtp/configs/:id', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(SmtpConfiguration);
  const cfg = await repo.findOne({ where: { id: req.params.id } });
  if (!cfg) return res.status(404).json({ success: false, error: 'Not found' });
  await repo.remove(cfg);
  return res.json({ success: true });
});

router.post('/smtp/validate', authenticateJWT, async (req, res) => {
  const result = await validateSmtpConfig(req.body);
  return res.json({ success: result.success, error: result.error });
});

// SMTP import
const upload = multer({ dest: '/tmp' });
router.post('/settings/smtp/import', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'File required' });
    const cfg: SmtpConfiguration = Object.assign(new SmtpConfiguration(), req.body || {});
    const result = await validateAndProcessFile(req.file as any, cfg);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Import failed' });
  }
});

// Email send (record tracking)
router.post('/send-email', authenticateJWT, async (req, res) => {
  try {
    const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
    const configs = await smtpRepo.find({ where: { isActive: true } as any });
    const primary = configs[0];
    if (!primary) return res.status(400).json({ success: false, error: 'No SMTP configured' });
    const result = await emailService.sendEmail(req.body, primary);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Send failed' });
  }
});

// Email drafts (no persistence)
const drafts: any[] = [];
router.get('/emails/drafts', authenticateJWT, (_req, res) => res.json({ success: true, drafts }));
router.post('/emails/drafts', authenticateJWT, (req, res) => { drafts.push({ ...req.body, id: Date.now().toString() }); return res.json({ success: true }); });
router.delete('/emails/drafts/:id', authenticateJWT, (req, res) => { const i = drafts.findIndex(d => d.id === req.params.id); if (i>=0) drafts.splice(i,1); return res.json({ success: true }); });

// Tracking stats
router.get('/tracking/stats', authenticateJWT, async (_req, res) => {
  const repo = AppDataSource.getRepository(EmailTracking);
  const total = await repo.count();
  const delivered = await repo.count({ where: { status: 'delivered' } as any });
  const failed = await repo.count({ where: { status: 'failed' } as any });
  const hourly = await repo.find();
  return res.json({
    total,
    delivered,
    failed,
    successRate: total ? Math.round((delivered/total)*100) : 0,
    hourly: hourly.slice(-24).map(t => ({ time: t.timestamp, status: t.status }))
  });
});

// Telegram config (ephemeral)
let telegramConfig: any = null;
router.post('/telegram/config', authenticateJWT, (req, res) => { telegramConfig = req.body; return res.json({ success: true }); });
router.get('/telegram/config', authenticateJWT, (_req, res) => res.json({ success: true, config: telegramConfig }));

// Landing Pages CRUD and generation
router.get('/landing-pages', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(LandingPage);
  const pages = await repo.find({ where: { user: { id: req.user!.id } } as any, order: { updatedAt: 'DESC' } });
  return res.json(pages);
});

router.post('/landing-pages', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(LandingPage);
  const body = req.body || {};
  const page = repo.create({
    name: body.name || 'Landing Page',
    sourceType: body.sourceType || 'template',
    html: body.html || '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><h1>New Page</h1></body></html>',
    css: body.css || '',
    url: body.url,
    assets: body.assets || {},
    user: req.user!
  });
  const saved = await repo.save(page);
  return res.status(201).json(saved);
});

router.post('/landing-pages/generate', authenticateJWT, async (req, res) => {
  const prompt = (req.body?.prompt || '').toString();
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  // Basic generator placeholder; integrate real model later
  const title = `Generated: ${prompt}`;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title><style>body{font-family:sans-serif;margin:0;padding:24px}section{max-width:900px;margin:auto}header,footer{background:#0b132b;color:#fff;padding:16px;border-radius:8px}main{padding:16px}button{background:#1c2541;color:#fff;border:none;padding:12px 16px;border-radius:6px}</style></head><body><header><h1>${title}</h1></header><main><section><p>This is a responsive landing page generated from your prompt.</p><p>Prompt: ${prompt}</p><button>Get Started</button></section></main><footer><small>© Surprise Sender</small></footer></body></html>`;
  const repo = AppDataSource.getRepository(LandingPage);
  const saved = await repo.save(repo.create({ name: title, sourceType: 'generated', html, user: req.user! }));
  return res.json(saved);
});

router.patch('/landing-pages/:id', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(LandingPage);
  const page = await repo.findOne({ where: { id: req.params.id } });
  if (!page) return res.status(404).json({ error: 'Not found' });
  Object.assign(page, req.body || {});
  const saved = await repo.save(page);
  return res.json(saved);
});

router.delete('/landing-pages/:id', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(LandingPage);
  const page = await repo.findOne({ where: { id: req.params.id } });
  if (!page) return res.status(404).json({ error: 'Not found' });
  await repo.remove(page);
  return res.json({ success: true });
});

// Dashboard endpoints
router.get('/dashboard/stats', authenticateJWT, async (req, res) => {
  try {
    const range = (req.query.timeRange as string) || '7d';
    const now = new Date();
    const offsets: any = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30, '90d': 24 * 90 };
    const hours = offsets[range] ?? 24 * 7;
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

    const trackingRepo = AppDataSource.getRepository(EmailTracking);
    const items = await trackingRepo.find();
    const inRange = items.filter(i => new Date(i.timestamp) >= start);
    const sent = inRange.filter(i => i.status === 'delivered').length;
    const failed = inRange.filter(i => i.status === 'failed').length;
    const total = inRange.length;
    const successRate = total ? Math.round((sent / total) * 100) : 0;

    return res.json({
      emails: { total, sent, failed, pending: Math.max(0, total - sent - failed), successRate },
      sms: { total: 0, sent: 0, failed: 0, pending: 0, successRate: 0 },
      html: { total: 0, sent: 0, failed: 0, pending: 0, successRate: 0 }
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to get dashboard stats' });
  }
});

router.get('/dashboard/activity', authenticateJWT, async (_req, res) => {
  try {
    const trackingRepo = AppDataSource.getRepository(EmailTracking);
    const items = await trackingRepo.find({ order: { timestamp: 'DESC' }, take: 20 });
    const activity = items.map(i => ({
      id: i.id,
      type: 'email',
      status: (i.status as any) || 'success',
      recipient: i.email,
      timestamp: i.timestamp,
      details: `${i.subject} (${i.details?.slice(0, 60) || ''})`
    }));
    return res.json(activity);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to get dashboard activity' });
  }
});

// Basic Bulk SMS endpoint (stub implementation)
router.post('/sms/send-bulk', authenticateJWT, async (req, res) => {
  try {
    const { recipients = [], message, senderId, options } = req.body || {};
    if (!Array.isArray(recipients) || recipients.length === 0 || !message) {
      return res.status(400).json({ success: false, error: 'recipients[] and message are required' });
    }
    // Stub: return a success summary (integrate real SMS provider later)
    const total = recipients.length;
    return res.json({ success: true, data: { total, sent: total, failed: 0 } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Bulk SMS failed' });
  }
});

export default router;
