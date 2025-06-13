import nodemailer from 'nodemailer';
import { SmtpConfiguration } from '../entities/SmtpConfiguration';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse';
import * as xlsx from 'xlsx';
import { promisify } from 'util';
import { Multer } from 'multer';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

interface FileData {
    email: string;
    name?: string;
    [key: string]: any;
}

export async function validateSmtpConfig(config: SmtpConfiguration): Promise<{ success: boolean; error?: string }> {
    try {
        // Validate required fields
        if (!config.host || !config.port || !config.username || !config.password) {
            throw new Error('Missing required SMTP configuration fields');
        }

        let transporter: nodemailer.Transporter;

        switch (config.providerType) {
            case 'smtp':
                transporter = nodemailer.createTransport({
                    host: config.host,
                    port: config.port,
                    secure: config.secure,
                    auth: {
                        user: config.username,
                        pass: config.password
                    },
                    tls: {
                        rejectUnauthorized: config.security?.tls ?? true
                    }
                });
                break;

            case 'webmail':
                if (!config.webmailProvider) {
                    throw new Error('Webmail provider is required for webmail type');
                }
                const webmailConfig = getWebmailConfig(config);
                transporter = nodemailer.createTransport(webmailConfig);
                break;

            case 'api':
                if (!config.apiProvider) {
                    throw new Error('API provider is required for API type');
                }
                const apiConfig = getApiConfig(config);
                transporter = nodemailer.createTransport(apiConfig);
                break;

            default:
                throw new Error(`Unsupported provider type: ${config.providerType}`);
        }

        // Test the connection with timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('SMTP connection timeout')), 10000);
        });

        await Promise.race([
            transporter.verify(),
            timeoutPromise
        ]);

        return { success: true };
    } catch (error) {
        console.error('SMTP validation error:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error during validation'
        };
    }
}

export async function validateAndProcessFile(
    file: Express.Multer.File,
    config: SmtpConfiguration
): Promise<{ success: boolean; data?: FileData[]; error?: string }> {
    try {
        // Validate file size
        const maxFileSize = config.limits?.maxFileSize ?? 10 * 1024 * 1024; // Default 10MB
        if (file.size > maxFileSize) {
            throw new Error(`File size exceeds maximum limit of ${maxFileSize / (1024 * 1024)}MB`);
        }

        // Validate file type
        const fileExt = path.extname(file.originalname).toLowerCase();
        const allowedTypes = config.limits?.allowedFileTypes ?? ['.txt', '.csv', '.xlsx', '.xls'];
        if (!allowedTypes.includes(fileExt)) {
            throw new Error(`File type ${fileExt} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }

        // Create upload directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'uploads/smtp');
        await mkdirAsync(uploadDir, { recursive: true });

        // Process file based on type
        let data: FileData[] = [];
        switch (fileExt) {
            case '.csv':
                data = await processCsvFile(file.path);
                break;
            case '.xlsx':
            case '.xls':
                data = await processExcelFile(file.path);
                break;
            case '.txt':
                data = await processTxtFile(file.path);
                break;
            default:
                throw new Error('Unsupported file type');
        }

        // Validate data
        const validationResult = validateData(data, config);
        if (!validationResult.success) {
            throw new Error(validationResult.error);
        }

        return { success: true, data };
    } catch (error) {
        console.error('File processing error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during file processing'
        };
    }
}

async function processCsvFile(filePath: string): Promise<FileData[]> {
    const fileContent = await readFileAsync(filePath, 'utf-8');
    return new Promise((resolve, reject) => {
        csv.parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        }, (err: Error | undefined, data: FileData[]) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

async function processExcelFile(filePath: string): Promise<FileData[]> {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_json<FileData>(worksheet);
    } catch (error) {
        throw new Error(`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function processTxtFile(filePath: string): Promise<FileData[]> {
    try {
        const content = await readFileAsync(filePath, 'utf-8');
        return content.split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                const [email, ...nameParts] = line.split(/[,;|]/).map(part => part.trim());
                return {
                    email,
                    name: nameParts.join(' ')
                };
            });
    } catch (error) {
        throw new Error(`Failed to process text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function validateData(data: FileData[], config: SmtpConfiguration): { success: boolean; error?: string } {
    try {
        // Check number of recipients
        const maxRecipients = config.limits?.daily ?? 10000;
        if (data.length > maxRecipients) {
            throw new Error(`Number of recipients exceeds maximum limit of ${maxRecipients}`);
        }

        // Validate required fields and email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const record of data) {
            if (!record.email) {
                throw new Error('Missing required field: email');
            }

            if (!emailPattern.test(record.email)) {
                throw new Error(`Invalid email format: ${record.email}`);
            }
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during data validation'
        };
    }
}

function getWebmailConfig(smtpConfig: SmtpConfiguration): any {
    const webmailConfigs: { [key: string]: any } = {
        'gmail': {
            service: 'gmail',
            auth: {
                user: smtpConfig.username,
                pass: smtpConfig.password
            }
        },
        'outlook': {
            host: 'smtp-mail.outlook.com',
            port: 587,
            secure: false,
            auth: {
                user: smtpConfig.username,
                pass: smtpConfig.password
            }
        },
        'yahoo': {
            host: 'smtp.mail.yahoo.com',
            port: 587,
            secure: false,
            auth: {
                user: smtpConfig.username,
                pass: smtpConfig.password
            }
        }
    };

    const provider = smtpConfig.webmailProvider?.toLowerCase() ?? '';
    const webmailSettings = webmailConfigs[provider];
    if (!webmailSettings) {
        throw new Error(`Unsupported webmail provider: ${provider}`);
    }

    return webmailSettings;
}

function getApiConfig(smtpConfig: SmtpConfiguration): any {
    const apiConfigs: { [key: string]: any } = {
        'mailgun': {
            host: 'smtp.mailgun.org',
            port: 587,
            secure: false,
            auth: {
                user: smtpConfig.username,
                pass: smtpConfig.apiKey
            }
        },
        'sendgrid': {
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
                user: 'apikey',
                pass: smtpConfig.apiKey
            }
        },
        'amazon-ses': {
            host: `email-smtp.${smtpConfig.region}.amazonaws.com`,
            port: 587,
            secure: false,
            auth: {
                user: smtpConfig.username,
                pass: smtpConfig.apiKey
            }
        }
    };

    const provider = smtpConfig.apiProvider?.toLowerCase() ?? '';
    const apiSettings = apiConfigs[provider];
    if (!apiSettings) {
        throw new Error(`Unsupported API provider: ${provider}`);
    }

    return apiSettings;
}

export function sortSmtpConfigs(configs: SmtpConfiguration[]): SmtpConfiguration[] {
    return configs.sort((a, b) => {
        // First sort by validity
        if (a.isValid !== b.isValid) {
            return a.isValid ? -1 : 1;
        }

        // Then sort by status
        const statusOrder: { [key: string]: number } = { 'active': 0, 'inactive': 1, 'error': 2 };
        const statusDiff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
        if (statusDiff !== 0) {
            return statusDiff;
        }

        // Then sort by last used date
        if (a.lastUsed && b.lastUsed) {
            return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        }
        if (a.lastUsed) return -1;
        if (b.lastUsed) return 1;

        // Finally sort by creation date
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
} 