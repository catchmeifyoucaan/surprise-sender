import { DataSource } from 'typeorm';
import { User, SmtpConfiguration, EmailTracking, UserActivity, EmailTemplate, Campaign, Agent, UserPreferencesEntity } from './entities';
import { ApiKeyEntity } from './entities/ApiKeyEntity';
import { WebmailCredential, CpanelCredential, PhpMyAdminCredential, EmailAccount, EmailAddress } from './entities/WebCredentials';

const isProduction = process.env.NODE_ENV === 'production';
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const hasExplicitHost = !!process.env.DB_HOST;

const sqliteDbPath = isProduction
  ? (process.env.SQLITE_PATH || '/data/database.sqlite')
  : './data/database.sqlite';

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
    EmailAddress
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