import { DataSource } from 'typeorm';
import { User, SmtpConfiguration, EmailTracking, UserActivity, EmailTemplate, Campaign, Agent, UserPreferencesEntity } from './entities';
import { ApiKeyEntity } from './entities/ApiKeyEntity';

const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: isProduction ? 'postgres' : 'sqlite',
  host: isProduction ? process.env.DB_HOST : undefined,
  port: isProduction ? parseInt(process.env.DB_PORT || '5432') : undefined,
  username: isProduction ? process.env.DB_USERNAME : undefined,
  password: isProduction ? process.env.DB_PASSWORD : undefined,
  database: isProduction ? process.env.DB_NAME : './data/database.sqlite',
  url: isProduction ? process.env.DATABASE_URL : undefined,
  synchronize: !isProduction, // Only synchronize in development
  logging: !isProduction,
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
  subscribers: [],
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  extra: isProduction ? {
    ssl: {
      rejectUnauthorized: false
    }
  } : {}
}); 