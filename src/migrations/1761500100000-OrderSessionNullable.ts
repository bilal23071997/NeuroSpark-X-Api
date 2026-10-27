import type { MigrationInterface, QueryRunner } from 'typeorm';

// Orders are now saved before their Stripe session exists, so the session id
// may be empty for a moment (the unique index allows many nulls).
export class OrderSessionNullable1761500100000 implements MigrationInterface {
  name = 'OrderSessionNullable1761500100000';

  async up(queryRunner: QueryRunner) {
    await queryRunner.query('ALTER TABLE "orders" ALTER COLUMN "stripeSessionId" DROP NOT NULL');
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query('DELETE FROM "orders" WHERE "stripeSessionId" IS NULL');
    await queryRunner.query('ALTER TABLE "orders" ALTER COLUMN "stripeSessionId" SET NOT NULL');
  }
}
