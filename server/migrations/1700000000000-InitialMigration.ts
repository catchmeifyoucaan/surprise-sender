import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class InitialMigration1700000000000 implements MigrationInterface {
    name = 'InitialMigration1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Users table
        await queryRunner.createTable(
            new Table({
                name: "user",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        isPrimary: true,
                        length: "36"
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "email",
                        type: "varchar",
                        length: "255",
                        isUnique: true
                    },
                    {
                        name: "password",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "role",
                        type: "varchar",
                        length: "50",
                        default: "'user'"
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "50",
                        default: "'active'"
                    },
                    {
                        name: "company",
                        type: "varchar",
                        length: "255",
                        isNullable: true
                    },
                    {
                        name: "permissions",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "twoFactorEnabled",
                        type: "boolean",
                        default: false
                    },
                    {
                        name: "twoFactorRecoveryCodes",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "preferences",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "securitySettings",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "loginHistory",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "lastLogin",
                        type: "datetime",
                        isNullable: true
                    },
                    {
                        name: "createdAt",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP"
                    },
                    {
                        name: "updatedAt",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP"
                    }
                ]
            })
        );

        // SMTP Configurations table
        await queryRunner.createTable(
            new Table({
                name: "smtp_configuration",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        isPrimary: true,
                        length: "36"
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "host",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "port",
                        type: "int"
                    },
                    {
                        name: "username",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "password",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "secure",
                        type: "boolean",
                        default: false
                    },
                    {
                        name: "isActive",
                        type: "boolean",
                        default: true
                    },
                    {
                        name: "isValid",
                        type: "boolean",
                        default: false
                    },
                    {
                        name: "lastValidated",
                        type: "datetime",
                        isNullable: true
                    },
                    {
                        name: "lastError",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "deliveryScore",
                        type: "int",
                        isNullable: true
                    },
                    {
                        name: "speedScore",
                        type: "int",
                        isNullable: true
                    },
                    {
                        name: "reputationScore",
                        type: "int",
                        isNullable: true
                    },
                    {
                        name: "stats",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "metadata",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "userId",
                        type: "varchar",
                        length: "36"
                    },
                    {
                        name: "createdAt",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP"
                    },
                    {
                        name: "updatedAt",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP"
                    }
                ]
            })
        );

        // Email Tracking table
        await queryRunner.createTable(
            new Table({
                name: "email_tracking",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        isPrimary: true,
                        length: "36"
                    },
                    {
                        name: "email",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "subject",
                        type: "varchar",
                        length: "500"
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "50"
                    },
                    {
                        name: "details",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "smtpConfigId",
                        type: "varchar",
                        length: "36",
                        isNullable: true
                    },
                    {
                        name: "userId",
                        type: "varchar",
                        length: "36",
                        isNullable: true
                    },
                    {
                        name: "campaignId",
                        type: "varchar",
                        length: "36",
                        isNullable: true
                    },
                    {
                        name: "campaignName",
                        type: "varchar",
                        length: "255",
                        isNullable: true
                    },
                    {
                        name: "messageId",
                        type: "varchar",
                        length: "255",
                        isNullable: true
                    },
                    {
                        name: "metadata",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "sentAt",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP"
                    },
                    {
                        name: "createdAt",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP"
                    }
                ]
            })
        );

        // User Activities table
        await queryRunner.createTable(
            new Table({
                name: "user_activity",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        isPrimary: true,
                        length: "36"
                    },
                    {
                        name: "userId",
                        type: "varchar",
                        length: "36"
                    },
                    {
                        name: "action",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "50"
                    },
                    {
                        name: "ipAddress",
                        type: "varchar",
                        length: "45",
                        isNullable: true
                    },
                    {
                        name: "userAgent",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "metadata",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "timestamp",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP"
                    }
                ]
            })
        );

        // Agents table
        await queryRunner.createTable(
            new Table({
                name: "agent",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        isPrimary: true,
                        length: "36"
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "description",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "type",
                        type: "varchar",
                        length: "100"
                    },
                    {
                        name: "specificFields",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "templates",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "metadata",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "aiConfig",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "isActive",
                        type: "boolean",
                        default: true
                    },
                    {
                        name: "userId",
                        type: "varchar",
                        length: "36"
                    },
                    {
                        name: "createdAt",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP"
                    },
                    {
                        name: "updatedAt",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP"
                    }
                ]
            })
        );

        // API Keys table
        await queryRunner.createTable(
            new Table({
                name: "api_key",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        isPrimary: true,
                        length: "36"
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "key",
                        type: "varchar",
                        length: "255",
                        isUnique: true
                    },
                    {
                        name: "permissions",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "isActive",
                        type: "boolean",
                        default: true
                    },
                    {
                        name: "lastUsed",
                        type: "datetime",
                        isNullable: true
                    },
                    {
                        name: "expiresAt",
                        type: "datetime",
                        isNullable: true
                    },
                    {
                        name: "userId",
                        type: "varchar",
                        length: "36"
                    },
                    {
                        name: "createdAt",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP"
                    },
                    {
                        name: "updatedAt",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP"
                    }
                ]
            })
        );

        // Create indexes
        await queryRunner.createIndex("user", {
            name: "IDX_USER_EMAIL",
            columnNames: ["email"]
        });

        await queryRunner.createIndex("smtp_configuration", {
            name: "IDX_SMTP_USER_ID",
            columnNames: ["userId"]
        });

        await queryRunner.createIndex("email_tracking", {
            name: "IDX_EMAIL_USER_ID",
            columnNames: ["userId"]
        });

        await queryRunner.createIndex("email_tracking", {
            name: "IDX_EMAIL_SMTP_CONFIG_ID",
            columnNames: ["smtpConfigId"]
        });

        await queryRunner.createIndex("user_activity", {
            name: "IDX_ACTIVITY_USER_ID",
            columnNames: ["userId"]
        });

        await queryRunner.createIndex("user_activity", {
            name: "IDX_ACTIVITY_TIMESTAMP",
            columnNames: ["timestamp"]
        });

        await queryRunner.createIndex("agent", {
            name: "IDX_AGENT_USER_ID",
            columnNames: ["userId"]
        });

        await queryRunner.createIndex("api_key", {
            name: "IDX_API_KEY_KEY",
            columnNames: ["key"]
        });

        // Create foreign keys
        await queryRunner.createForeignKey("smtp_configuration", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "user",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("email_tracking", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "user",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("email_tracking", new TableForeignKey({
            columnNames: ["smtpConfigId"],
            referencedColumnNames: ["id"],
            referencedTableName: "smtp_configuration",
            onDelete: "SET NULL"
        }));

        await queryRunner.createForeignKey("user_activity", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "user",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("agent", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "user",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("api_key", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "user",
            onDelete: "CASCADE"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
        await queryRunner.dropForeignKey("api_key", "FK_api_key_user");
        await queryRunner.dropForeignKey("agent", "FK_agent_user");
        await queryRunner.dropForeignKey("user_activity", "FK_user_activity_user");
        await queryRunner.dropForeignKey("email_tracking", "FK_email_tracking_smtp_configuration");
        await queryRunner.dropForeignKey("email_tracking", "FK_email_tracking_user");
        await queryRunner.dropForeignKey("smtp_configuration", "FK_smtp_configuration_user");

        // Drop indexes
        await queryRunner.dropIndex("api_key", "IDX_API_KEY_KEY");
        await queryRunner.dropIndex("agent", "IDX_AGENT_USER_ID");
        await queryRunner.dropIndex("user_activity", "IDX_ACTIVITY_TIMESTAMP");
        await queryRunner.dropIndex("user_activity", "IDX_ACTIVITY_USER_ID");
        await queryRunner.dropIndex("email_tracking", "IDX_EMAIL_SMTP_CONFIG_ID");
        await queryRunner.dropIndex("email_tracking", "IDX_EMAIL_USER_ID");
        await queryRunner.dropIndex("smtp_configuration", "IDX_SMTP_USER_ID");
        await queryRunner.dropIndex("user", "IDX_USER_EMAIL");

        // Drop tables
        await queryRunner.dropTable("api_key");
        await queryRunner.dropTable("agent");
        await queryRunner.dropTable("user_activity");
        await queryRunner.dropTable("email_tracking");
        await queryRunner.dropTable("smtp_configuration");
        await queryRunner.dropTable("user");
    }
}