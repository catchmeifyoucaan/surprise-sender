import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../data-source';
import { User, UserActivity, SmtpConfiguration, EmailTracking } from '../entities';
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
  return res.json(req.user);
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

export default router;
