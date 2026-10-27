import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { ClientIpThrottlerGuard } from './common/client-ip-throttler.guard.js';
import { ContentModule } from './content/content.module.js';
import { EngagementModule } from './engagement/engagement.module.js';
import { HealthController } from './health/health.controller.js';
import { migrations } from './migrations/index.js';
import { PagesModule } from './pages/pages.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { StorageModule } from './storage/storage.module.js';
import { UsersModule } from './users/users.module.js';
import { VaultModule } from './vault/vault.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        synchronize: config.get('DB_SYNCHRONIZE') === 'true',
        // The schema is built by migrations (src/migrations). Set DB_MIGRATIONS_RUN=false to skip them on boot.
        migrations,
        migrationsRun: config.get('DB_MIGRATIONS_RUN') !== 'false',
        // Serverless (Vercel) opens a pool per instance, so keep it at 1 there.
        poolSize: Number(config.get('DB_POOL_MAX', 10)),
      }),
    }),
    // A loose limit for everything; login and the public forms set tighter ones with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    UsersModule,
    AuthModule,
    ContentModule,
    VaultModule,
    EngagementModule,
    SettingsModule,
    StorageModule,
    PagesModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ClientIpThrottlerGuard }],
})
export class AppModule {}
