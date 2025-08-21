import { DataSource } from 'typeorm';
import { User, SmtpConfiguration, EmailTracking, UserActivity, EmailTemplate, Campaign, Agent, UserPreferencesEntity } from './entities';
import { ApiKeyEntity } from './entities/ApiKeyEntity';

const isProduction = process.env.NODE_ENV === 'production';

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
    ApiKeyEntity
  ],
  migrations: isProduction ? ['dist/migrations/*.js'] : [],
  subscribers: []
};

const sqliteOptions = {
  type: 'sqlite' as const,
  database: './data/database.sqlite',
  synchronize: true,
  logging: true
};

const postgresOptions = {
  type: 'postgres' as const,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  ssl: { rejectUnauthorized: false },
  extra: {
    ssl: { rejectUnauthorized: false }
  }
};

const options: any = {
  ...(isProduction ? postgresOptions : sqliteOptions),
  ...baseOptions
};

export const AppDataSource = new DataSource(options);