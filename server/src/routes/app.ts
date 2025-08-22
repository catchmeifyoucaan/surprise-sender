import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../data-source';
import { User, UserActivity, SmtpConfiguration, EmailTracking, LandingPage } from '../entities';
import { authenticateJWT } from '../middleware/auth';
import { validateSmtpConfig, validateAndProcessFile, sortSmtpConfigs } from '../utils/smtp';
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

router.post('/smtp/configs/:id/validate', authenticateJWT, async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(SmtpConfiguration);
    const cfg = await repo.findOne({ where: { id: req.params.id } });
    if (!cfg) return res.status(404).json({ success: false, error: 'Not found' });
    const result = await validateSmtpConfig(cfg);
    cfg.isValid = !!result.success;
    (cfg as any).lastValidated = new Date();
    if (!result.success) (cfg as any).lastError = result.error;
    await repo.save(cfg);
    return res.json({ success: result.success, error: result.error, configuration: cfg });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Validation failed' });
  }
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

// Scalable import with validation and sorting
const upload = multer({ dest: '/tmp' });
router.post('/smtp/import-configs', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'File required' });

    const fs = (await import('fs')).promises as any;
    const path = await import('path');
    const xlsxLib: any = await import('xlsx');

    const ext = path.extname(req.file.originalname).toLowerCase();
    const raw = await fs.readFile(req.file.path, 'utf-8').catch(() => null);

    type RawRow = { host?: string; port?: any; username?: string; password?: string; secure?: any; name?: string };
    const rows: RawRow[] = [];

    const pushIfValid = (host?: string, port?: any, username?: string, password?: string, secure?: any, name?: string) => {
      const parsedPort = parseInt(String(port ?? 587), 10);
      if (!host || !parsedPort || !username || !password) return;
      const isSecure = String(secure ?? '').toLowerCase() === 'true' || parsedPort === 465;
      rows.push({ host: String(host).trim(), port: parsedPort, username: String(username).trim(), password: String(password), secure: isSecure, name: name ? String(name).trim() : `${host}:${parsedPort}` });
    };

    if (ext === '.xlsx' || ext === '.xls') {
      const wb = xlsxLib.readFile(req.file.path);
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json: any[] = xlsxLib.utils.sheet_to_json(ws);
      for (const r of json) {
        const get = (k: string) => r[k] ?? r[k.toLowerCase()] ?? r[k.toUpperCase()];
        pushIfValid(get('host'), get('port'), get('username'), get('password'), get('secure'), get('name'));
      }
    } else if (ext === '.csv') {
      const text = raw || '';
      const lines = text.split(/\r?\n/).filter((l: string) => l.trim());
      const header = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
      const hasHeader = ['host', 'port', 'username', 'password'].every((k) => header.includes(k));
      if (hasHeader) {
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          const getBy = (key: string) => cols[header.indexOf(key)]?.trim();
          pushIfValid(getBy('host'), getBy('port'), getBy('username'), getBy('password'), getBy('secure'), getBy('name'));
        }
      } else {
        for (const line of lines) {
          const parts = line.split(/[|,;\t]/).map((s: string) => s.trim()).filter(Boolean);
          if (parts.length >= 4) pushIfValid(parts[0], parts[1], parts[2], parts.slice(3).join('|'));
        }
      }
    } else {
      // Treat as text of lines host|port|username|password (or comma/semicolon)
      const text = raw || '';
      const lines = text.split(/\r?\n/).filter((l: string) => l.trim());
      for (const line of lines) {
        const parts = line.split(/[|,;\t]/).map((s: string) => s.trim()).filter(Boolean);
        if (parts.length >= 4) pushIfValid(parts[0], parts[1], parts[2], parts.slice(3).join('|'));
      }
    }

    if (rows.length === 0) {
      return res.json({ success: true, total: 0, successCount: 0, failedCount: 0, errors: ['No valid SMTP entries found'], configurations: [] });
    }

    // Map to entity and validate concurrently
    const mapped = rows.map((r) => Object.assign(new SmtpConfiguration(), {
      name: r.name,
      providerType: 'smtp',
      host: r.host,
      port: r.port,
      secure: r.secure,
      username: r.username,
      password: r.password,
      isActive: true,
      isValid: false,
      status: 'inactive'
    }));

    const limit = Math.max(10, Math.min(100, parseInt(process.env.SMTP_VALIDATE_CONCURRENCY || '50')));
    let idx = 0;
    const results: Array<{ cfg: SmtpConfiguration; ok: boolean; error?: string }> = [];
    const runNext = async (): Promise<void> => {
      const i = idx++;
      if (i >= mapped.length) return;
      const cfg = mapped[i];
      const out = await validateSmtpConfig(cfg);
      results[i] = { cfg, ok: out.success, error: out.error };
      return runNext();
    };
    await Promise.all(Array.from({ length: Math.min(limit, mapped.length) }).map(() => runNext()));

    const ok = results.filter(r => r.ok).map(r => r.cfg);
    const bad = results.filter(r => !r.ok);

    // Persist valid ones
    const repo = AppDataSource.getRepository(SmtpConfiguration);
    const saved = ok.length > 0 ? await repo.save(ok.map(v => ({ ...v, userId: (req.user as any).id })) as any) : [];

    return res.json({
      success: true,
      total: rows.length,
      successCount: saved.length,
      failedCount: bad.length,
      errors: bad.slice(0, 1000).map(b => `${b.cfg.username}@${b.cfg.host}: ${b.error}`),
      configurations: saved
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Import failed' });
  }
});

router.post('/smtp/bulk-delete', authenticateJWT, async (req, res) => {
  try {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) return res.status(400).json({ success: false, error: 'ids[] required' });
    const repo = AppDataSource.getRepository(SmtpConfiguration);
    const toDelete = await repo.findByIds(ids as any);
    if (toDelete.length === 0) return res.json({ success: true, deleted: 0 });
    await repo.remove(toDelete);
    return res.json({ success: true, deleted: toDelete.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Bulk delete failed' });
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

router.post('/ingest/import', authenticateJWT, multer({ dest: '/tmp' }).single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'File required' });
    const persistSmtp = String(req.query.persistSmtp || 'true').toLowerCase() !== 'false';
    const raw = (await (await import('fs')).promises.readFile(req.file.path, 'utf-8'));
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('========'));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    type MixedResult = {
      smtp: Array<{ host: string; port: number; username: string; password: string; secure: boolean; name?: string }>;
      webmail: Array<{ url: string; username: string; password: string }>;
      cpanel: Array<{ url: string; username: string; password: string }>;
      phpmyadmin: Array<{ url: string; username: string; password: string }>;
      emailPairs: Array<{ email: string; password: string }>;
      emails: string[];
      unknown: string[];
    };

    const acc: MixedResult = { smtp: [], webmail: [], cpanel: [], phpmyadmin: [], emailPairs: [], emails: [], unknown: [] };

    for (const line of lines) {
      // Patterns
      // SMTP: host|port|user|pass
      if (/^([^|]+)\|(\d{2,5})\|([^|]+)\|(.+)$/.test(line) && !line.includes('http')) {
        const [host, portStr, username, password] = line.split('|');
        const port = parseInt(portStr, 10);
        acc.smtp.push({ host, port, username, password, secure: port === 465, name: `${host}:${port}` });
        continue;
      }
      // Webmail (2096)
      if (/^https?:\/\/.+:(2096)\|[^|]+\|.+$/.test(line)) {
        const [url, username, password] = line.split('|');
        acc.webmail.push({ url, username, password });
        continue;
      }
      // cPanel (2083)
      if (/^https?:\/\/.+:(2083)\s*\S*\|?/.test(line) || /^https?:\/\/.+:(2083)\|[^|]+\|.+$/.test(line)) {
        const parts = line.includes('|') ? line.split('|') : line.split(/\s+/);
        const url = parts[0];
        const username = parts[1]?.replace(/^(Username:)/i, '').trim();
        const password = parts[2]?.replace(/^(Password:)/i, '').trim();
        if (url && username && password) acc.cpanel.push({ url, username, password }); else acc.unknown.push(line);
        continue;
      }
      // phpMyAdmin: url:username:password (contains phpmyadmin)
      if (line.toLowerCase().includes('phpmyadmin') && line.split(':').length >= 3) {
        const firstColon = line.indexOf(':');
        const url = line.slice(0, firstColon);
        const rest = line.slice(firstColon + 1);
        const [username, password] = rest.split(':');
        if (url && username && password) acc.phpmyadmin.push({ url, username, password }); else acc.unknown.push(line);
        continue;
      }
      // email:password
      if (line.includes(':')) {
        const [email, password] = line.split(':');
        if (emailRegex.test(email) && password) { acc.emailPairs.push({ email, password }); continue; }
      }
      // plain email
      if (emailRegex.test(line)) { acc.emails.push(line); continue; }

      acc.unknown.push(line);
    }

    // Validate SMTP concurrently
    const limit = Math.max(10, Math.min(100, parseInt(process.env.SMTP_VALIDATE_CONCURRENCY || '50')));
    const smtpResults: Array<{ cfg: SmtpConfiguration; ok: boolean; error?: string }> = [];
    if (acc.smtp.length > 0) {
      const mapped = acc.smtp.map(s => Object.assign(new SmtpConfiguration(), {
        name: s.name,
        providerType: 'smtp',
        host: s.host,
        port: s.port,
        secure: s.secure,
        username: s.username,
        password: (s as any).password,
        isActive: true,
        isValid: false,
        status: 'inactive'
      }));
      let idx = 0;
      const runNext = async (): Promise<void> => {
        const i = idx++;
        if (i >= mapped.length) return;
        const cfg = mapped[i];
        const out = await validateSmtpConfig(cfg);
        smtpResults[i] = { cfg, ok: out.success, error: out.error };
        return runNext();
      };
      await Promise.all(Array.from({ length: Math.min(limit, mapped.length) }).map(() => runNext()));
      if (persistSmtp) {
        const repo = AppDataSource.getRepository(SmtpConfiguration);
        const toSave = smtpResults.filter(r => r.ok).map(r => ({ ...r.cfg, userId: (req.user as any).id }));
        if (toSave.length > 0) await repo.save(toSave as any);
      }
    }

    const smtpValid = smtpResults.filter(r => r.ok).map(r => r.cfg);
    const smtpInvalid = smtpResults.filter(r => !r.ok).map(r => ({ cfg: r.cfg, error: r.error }));

    return res.json({
      success: true,
      stats: {
        smtp: acc.smtp.length,
        smtpValid: smtpValid.length,
        smtpInvalid: smtpInvalid.length,
        webmail: acc.webmail.length,
        cpanel: acc.cpanel.length,
        phpmyadmin: acc.phpmyadmin.length,
        emailPairs: acc.emailPairs.length,
        emails: acc.emails.length,
        unknown: acc.unknown.length
      },
      categories: {
        smtp: { valid: smtpValid, invalid: smtpInvalid.slice(0, 1000) },
        webmail: acc.webmail.slice(0, 1000),
        cpanel: acc.cpanel.slice(0, 1000),
        phpmyadmin: acc.phpmyadmin.slice(0, 1000),
        emailPairs: acc.emailPairs.slice(0, 1000),
        emails: acc.emails.slice(0, 5000),
        unknown: acc.unknown.slice(0, 1000)
      }
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Ingest failed' });
  }
});

export default router;
