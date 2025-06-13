import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import XLSX from 'xlsx';
import nodemailer from 'nodemailer';
import { prisma } from '../../../lib/prisma';
import { getSession } from 'next-auth/react';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['POST', 'OPTIONS'],
  credentials: true,
});

// Helper function to run middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// Configure formidable for file uploads
const form = formidable({
  uploadDir: path.join(process.cwd(), 'tmp'),
  keepExtensions: true,
  maxFileSize: 500 * 1024, // 500KB
  filter: ({ mimetype }) => {
    return mimetype ? /^(text\/csv|text\/plain|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel)$/.test(mimetype) : false;
  }
});

// Helper function to detect delimiter
function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0];
  const delimiters = [',', ';', '\t', '|', ':'];
  const counts = delimiters.map(d => ({
    delimiter: d,
    count: (firstLine.match(new RegExp(d, 'g')) || []).length
  }));
  return counts.reduce((a, b) => a.count > b.count ? a : b).delimiter;
}

// Helper function to clean and validate email
function cleanEmail(email: string): string | null {
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : null;
}

// Helper function to extract provider from email
function getProviderFromEmail(email: string): { provider: string; isWebmail: boolean } {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  const provider = domain.split('.')[0];
  const webmailProviders = ['gmail', 'outlook', 'hotmail', 'yahoo', 'hostinger', 'aol', 'protonmail', 'zoho'];
  const isWebmail = webmailProviders.includes(provider);
  return { provider, isWebmail };
}

// Helper function to parse a single line
function parseLine(line: string): any {
  // Remove any extra whitespace and special characters
  line = line.trim().replace(/[\r\n]+/g, '');
  if (!line) return null;

  // Try different formats
  const formats = [
    // Format: email:password
    /^([^:]+):([^:]+)$/,
    // Format: email|password
    /^([^|]+)\|([^|]+)$/,
    // Format: email:password:extra
    /^([^:]+):([^:]+):.*$/,
    // Format: email|password|extra
    /^([^|]+)\|([^|]+)\|.*$/,
    // Format: email password
    /^([^\s]+)\s+([^\s]+)$/,
    // Format: email,password
    /^([^,]+),([^,]+)$/,
    // Format: email;password
    /^([^;]+);([^;]+)$/,
    // Format: email\tpassword
    /^([^\t]+)\t([^\t]+)$/
  ];

  for (const format of formats) {
    const match = line.match(format);
    if (match) {
      const email = cleanEmail(match[1]);
      if (!email) continue;

      const password = match[2].trim();
      if (!password) continue;

      const { provider, isWebmail } = getProviderFromEmail(email);
      
      return {
        providerType: isWebmail ? 'webmail' : 'smtp',
        username: email,
        password: password,
        webmailProvider: isWebmail ? provider : undefined,
        host: isWebmail ? undefined : `smtp.${provider}.com`,
        port: 587,
        secure: true,
        name: email,
        maxEmailsPerDay: 1000,
        active: true
      };
    }
  }

  return null;
}

// Helper function to parse SMTP data from different formats
async function parseSmtpData(filePath: string, format: string, delimiter: string): Promise<any[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    let records: any[] = [];

    // Process each line directly
    for (const line of lines) {
      try {
        // Remove any extra whitespace and special characters
        const cleanLine = line.trim().replace(/[\r\n]+/g, '');
        if (!cleanLine) continue;

        // Split by : or | and take only the first two parts
        const parts = cleanLine.split(/[:|]/);
        if (parts.length < 2) continue;

        const email = parts[0].trim();
        const password = parts[1].trim();

        // Validate email
        if (!email.includes('@')) continue;

        // Extract provider from email
        const domain = email.split('@')[1].toLowerCase();
        const provider = domain.split('.')[0];
        const isWebmail = ['gmail', 'outlook', 'hotmail', 'yahoo', 'hostinger', 'aol', 'protonmail', 'zoho'].includes(provider);

        // Create SMTP configuration
        const config = {
          providerType: isWebmail ? 'webmail' : 'smtp',
          username: email,
          password: password,
          webmailProvider: isWebmail ? provider : undefined,
          host: isWebmail ? undefined : `smtp.${provider}.com`,
          port: 587,
          secure: true,
          name: email,
          maxEmailsPerDay: 1000,
          active: true
        };

        records.push(config);
      } catch (error) {
        console.error('Error processing line:', line, error);
        continue;
      }
    }

    return records;
  } catch (error) {
    console.error('Error parsing file:', error);
    throw new Error('Failed to parse file. Please check the format and try again.');
  }
}

// Helper function to validate SMTP configuration
async function validateSmtpConfig(config: any): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password
      }
    });

    await transporter.verify();
    return true;
  } catch (error) {
    console.error('SMTP validation error:', error);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Run CORS middleware
  await runMiddleware(req, res, cors);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse the file
    const records = await parseSmtpData(file.filepath, 'auto', 'auto');

    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid SMTP configurations found in file' });
    }

    // Process records
    const results = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
      configs: [] as any[]
    };

    for (const record of records) {
      try {
        // Validate SMTP configuration
        const isValid = await validateSmtpConfig(record);
        
        if (isValid) {
          results.success++;
          results.configs.push(record);
        } else {
          results.failed++;
          results.errors.push(`Invalid SMTP configuration for ${record.username}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Error processing ${record.username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Clean up temporary file
    await fs.unlink(file.filepath);

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error importing SMTP configs:', error);
    return res.status(500).json({ 
      error: 'Failed to import SMTP configurations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 