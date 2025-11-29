import { DataSource } from 'typeorm';
import { User, SmtpConfiguration, EmailTracking, UserActivity, EmailTemplate, Campaign, Agent, UserPreferencesEntity, PhishingCampaign, LandingPage } from './entities';
import { ApiKeyEntity } from './entities/ApiKeyEntity';
import { WebmailCredential, CpanelCredential, PhpMyAdminCredential, EmailAccount, EmailAddress } from './entities/WebCredentials';
import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const hasExplicitHost = !!process.env.DB_HOST;

function resolveSqlitePath(): string {
  if (!isProduction) return './data/database.sqlite';
  const defaultProd = '/data/database.sqlite';
  const fallbackProd = '/opt/render/project/src/data/database.sqlite';
  const envPath = process.env.SQLITE_PATH;
  const desired = envPath || defaultProd;
  try {
    const dir = path.dirname(desired);
    fs.accessSync(dir, fs.constants.W_OK);
    return desired;
  } catch {
    // If /data not writable, fallback to project path (ephemeral unless a disk is mounted there)
    try {
      const dir = path.dirname(fallbackProd);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore mkdir errors; TypeORM may still create file if possible
    }
    return fallbackProd;
  }
}

const sqliteDbPath = resolveSqlitePath();

const baseOptions = {
  entities: [
    User,
    SmtpConfiguration,
    EmailTracking,
    UserActivity,
    EmailTemplate,
    Campaign,
    Agent,
    UserPreferencesEntity,
    ApiKeyEntity,
    WebmailCredential,
    CpanelCredential,
    PhpMyAdminCredential,
    EmailAccount,
    EmailAddress,
    PhishingCampaign,
    LandingPage
  ],
  migrations: isProduction ? ['dist/migrations/*.js'] : [],
  subscribers: []
};

const sqliteOptions = {
  type: 'sqlite' as const,
  database: sqliteDbPath,
  synchronize: true,
  logging: true
};

const postgresOptions = hasDatabaseUrl
  ? {
    type: 'postgres' as const,
    url: process.env.DATABASE_URL,
    synchronize: true,
    logging: false,
    ssl: { rejectUnauthorized: false },
    extra: { ssl: { rejectUnauthorized: false } }
  }
  : {
    type: 'postgres' as const,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true,
    logging: false,
    ssl: { rejectUnauthorized: false },
    extra: { ssl: { rejectUnauthorized: false } }
  };

const usePostgres = isProduction && (hasDatabaseUrl || hasExplicitHost);
const options: any = {
  ...(usePostgres ? postgresOptions : sqliteOptions),
  ...baseOptions
};

export const AppDataSource = new DataSource(options);