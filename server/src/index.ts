import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { AppDataSource } from './data-source';
import emailRoutes from './routes/email';
import agentRoutes from './routes/agents';
import adminRoutes from './routes/admin';
import appRoutes from './routes/app';
import { errorHandler } from './middleware/validation';

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser
app.use(express.json({ limit: '50mb', strict: false }));

// API routes
app.use('/api/email', emailRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', appRoutes);
app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));

// Static frontend (Vite build in root/dist). __dirname is server/dist at runtime.
const staticRoot = path.resolve(__dirname, '../../dist');
app.use(express.static(staticRoot));

// SPA fallback for all non-API routes
app.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
  res.sendFile(path.join(staticRoot, 'index.html'));
});

// Error handler (last)
app.use(errorHandler);

// Start after DB init
AppDataSource.initialize()
  .then(() => {
    const PORT = process.env.PORT || 3001;
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