import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSecureColumn1749793460474 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the secure column if it doesn't exist
        const columnExists = await queryRunner.hasColumn("smtp_configuration", "secure");
        if (!columnExists) {
            await queryRunner.query(`ALTER TABLE "smtp_configuration" ADD COLUMN "secure" boolean NOT NULL DEFAULT 0`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the secure column if it exists
        const columnExists = await queryRunner.hasColumn("smtp_configuration", "secure");
        if (columnExists) {
            await queryRunner.query(`ALTER TABLE "smtp_configuration" DROP COLUMN "secure"`);
        }
    }
} 