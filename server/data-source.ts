import { DataSource } from "typeorm";
import { SmtpConfiguration } from "./entities/SmtpConfiguration";
import { EmailTracking } from "./entities/EmailTracking";
import { User } from "./entities/User";
import { UserActivity } from "./entities/UserActivity";
import { EmailTemplate } from "./entities/EmailTemplate";
import { Campaign } from "./entities/Campaign";
import { Agent } from "./entities/Agent";
import { UserPreferencesEntity } from "./entities/UserPreferences";
import { ApiKeyEntity } from "./entities/ApiKeyEntity";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "surprise-sender.db",
  synchronize: false,
  logging: true,
  entities: [
    SmtpConfiguration,
    EmailTracking,
    User,
    UserActivity,
    EmailTemplate,
    Campaign,
    Agent,
    UserPreferencesEntity,
    ApiKeyEntity
  ],
  migrations: ["migrations/*.ts"],
  subscribers: [],
}); 