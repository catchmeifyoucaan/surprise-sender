import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { AppDataSource } from './data-source';
import emailRoutes from './routes/email';
import agentRoutes from './routes/agents';
import adminRoutes from './routes/admin';
import appRoutes from './routes/app';
import { errorHandler } from './middleware/validation';
import rateLimit from 'express-rate-limit';

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.error('Missing JWT_SECRET in production. Refusing to start.');
  process.exit(1);
}
if (isProduction && !process.env.CORS_ORIGIN) {
  // eslint-disable-next-line no-console
  console.error('Missing CORS_ORIGIN in production. Refusing to start.');
  process.exit(1);
}

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Apply basic rate limiting to sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);
app.use('/api/ingest', ingestLimiter);

// Body parser
app.use(express.json({ limit: '50mb', strict: false }));

// API routes
app.use('/api/email', emailRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', appRoutes);
app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));
app.get('/api/version', (_req: Request, res: Response) => {
  const version = process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || process.env.COMMIT_REF || 'dev';
  res.json({ version, ts: new Date().toISOString() });
});

// Static frontend (Vite build in root/dist). __dirname is server/dist at runtime.
const staticRoot = path.resolve(__dirname, '../../dist');
app.use(express.static(staticRoot, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surprise-Sender', 'no-html-cache');
    }
  }
}));

// SPA fallback for all non-API routes
app.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(staticRoot, 'index.html'));
});

// Error handler (last)
app.use(errorHandler);

// Ensure SQLite path exists in production when no DATABASE_URL
(function ensureSqliteDir() {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  if (isProduction && !hasDatabaseUrl) {
    try {
      const dir = '/data';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      // eslint-disable-next-line no-console
      console.log('Using SQLite at /data/database.sqlite (persistent if mounted).');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to ensure /data directory for SQLite:', e);
    }
  } else if (isProduction && hasDatabaseUrl) {
    // eslint-disable-next-line no-console
    console.log('Using PostgreSQL via DATABASE_URL');
  }
})();

// Start after DB init
AppDataSource.initialize()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    // Seed default admin (optional)
    (async () => {
      try {
        const rawAdminEmails = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'admin-0@surprise-sender.com,admin@surprise-sender.local';
        const adminEmails: string[] = rawAdminEmails.split(',').map((e) => e.trim()).filter(Boolean);
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
        const userRepo = AppDataSource.getRepository(require('./entities/User').User);
        const bcrypt = require('bcrypt');
        for (const email of adminEmails) {
          try {
            let existing = await userRepo.findOne({ where: { email } });
            if (!existing) {
              const hashed = await bcrypt.hash(adminPassword, 12);
              const created = userRepo.create({ name: 'Administrator', email, password: hashed, role: 'admin', status: 'active' });
              await userRepo.save(created);
              console.log(`Seeded admin user ${email}`);
            } else if (existing.role !== 'admin') {
              existing.role = 'admin';
              await userRepo.save(existing);
              console.log(`Upgraded user to admin: ${email}`);
            }
          } catch (innerErr) {
            console.error('Admin seed per-email failed:', email, innerErr);
          }
        }
      } catch (e) {
        console.error('Admin seed failed:', e);
      }
    })();
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Error during Data Source initialization:', err);
    process.exit(1);
  });

export default app;