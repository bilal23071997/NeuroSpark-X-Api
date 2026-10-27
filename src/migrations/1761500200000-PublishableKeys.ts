import type { MigrationInterface, QueryRunner } from 'typeorm';

// Checkout is shown inside the website (Stripe embedded checkout), which needs
// the publishable key of each mode.
export class PublishableKeys1761500200000 implements MigrationInterface {
  name = 'PublishableKeys1761500200000';

  async up(queryRunner: QueryRunner) {
    await queryRunner.query('ALTER TABLE "payment_config" ADD COLUMN IF NOT EXISTS "testPublishableKey" text');
    await queryRunner.query('ALTER TABLE "payment_config" ADD COLUMN IF NOT EXISTS "livePublishableKey" text');
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query('ALTER TABLE "payment_config" DROP COLUMN IF EXISTS "livePublishableKey"');
    await queryRunner.query('ALTER TABLE "payment_config" DROP COLUMN IF EXISTS "testPublishableKey"');
  }
}
