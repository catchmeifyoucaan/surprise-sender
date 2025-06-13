import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSmtpConfiguration1749789089659 implements MigrationInterface {
    name = 'UpdateSmtpConfiguration1749789089659'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First check if the table exists
        const tableExists = await queryRunner.hasTable("smtp_configuration");
        
        if (!tableExists) {
            // Create the table with all required columns
            await queryRunner.query(`
                CREATE TABLE "smtp_configuration" (
                    "id" varchar PRIMARY KEY NOT NULL,
                    "userId" varchar NOT NULL,
                    "name" varchar NOT NULL,
                    "host" varchar NOT NULL,
                    "port" integer NOT NULL,
                    "username" varchar NOT NULL,
                    "password" varchar NOT NULL,
                    "secure" boolean NOT NULL DEFAULT 0,
                    "isActive" boolean NOT NULL DEFAULT 1,
                    "lastChecked" datetime,
                    "lastValidated" datetime,
                    "lastUsed" datetime,
                    "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                    "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                    "maxEmailsPerDay" integer NOT NULL DEFAULT 1000,
                    "currentEmailsSent" integer NOT NULL DEFAULT 0,
                    "status" varchar NOT NULL DEFAULT 'inactive',
                    "providerType" varchar NOT NULL DEFAULT 'smtp',
                    "webmailProvider" varchar,
                    "apiProvider" varchar,
                    "apiKey" varchar,
                    "region" varchar,
                    "fromEmail" varchar,
                    "fromName" varchar,
                    "isValid" boolean NOT NULL DEFAULT 0,
                    "lastError" varchar,
                    "security" text,
                    "stats" text,
                    "limits" text
                )
            `);
        } else {
            // Add missing columns one by one
            const columns = [
                { name: "secure", type: "boolean", defaultValue: "0" },
                { name: "isActive", type: "boolean", defaultValue: "1" },
                { name: "lastChecked", type: "datetime", nullable: true },
                { name: "lastValidated", type: "datetime", nullable: true },
                { name: "lastUsed", type: "datetime", nullable: true },
                { name: "maxEmailsPerDay", type: "integer", defaultValue: "1000" },
                { name: "currentEmailsSent", type: "integer", defaultValue: "0" },
                { name: "status", type: "varchar", defaultValue: "'inactive'" },
                { name: "providerType", type: "varchar", defaultValue: "'smtp'" },
                { name: "webmailProvider", type: "varchar", nullable: true },
                { name: "apiProvider", type: "varchar", nullable: true },
                { name: "apiKey", type: "varchar", nullable: true },
                { name: "region", type: "varchar", nullable: true },
                { name: "fromEmail", type: "varchar", nullable: true },
                { name: "fromName", type: "varchar", nullable: true },
                { name: "isValid", type: "boolean", defaultValue: "0" },
                { name: "lastError", type: "varchar", nullable: true },
                { name: "security", type: "text", nullable: true },
                { name: "stats", type: "text", nullable: true },
                { name: "limits", type: "text", nullable: true }
            ];

            for (const column of columns) {
                const columnExists = await queryRunner.hasColumn("smtp_configuration", column.name);
                if (!columnExists) {
                    await queryRunner.query(`
                        ALTER TABLE "smtp_configuration" 
                        ADD COLUMN "${column.name}" ${column.type} ${column.nullable ? 'NULL' : 'NOT NULL'} ${column.defaultValue ? `DEFAULT ${column.defaultValue}` : ''}
                    `);
                }
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Since SQLite doesn't support dropping columns, we'll recreate the table
        await queryRunner.query(`DROP TABLE "smtp_configuration"`);
        await queryRunner.query(`
            CREATE TABLE "smtp_configuration" (
                "id" varchar PRIMARY KEY NOT NULL,
                "userId" varchar NOT NULL,
                "name" varchar NOT NULL,
                "host" varchar NOT NULL,
                "port" integer NOT NULL,
                "username" varchar NOT NULL,
                "password" varchar NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
    }
}
