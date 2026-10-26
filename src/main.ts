import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

/** /docs is on unless SWAGGER_ENABLED says otherwise; with no setting it is off in production. */
function swaggerEnabled() {
  const setting = process.env.SWAGGER_ENABLED?.toLowerCase();
  if (setting === 'true') return true;
  if (setting === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

async function bootstrap() {
  const PORT = process.env.PORT ?? 3001
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Stripe webhooks are verified against the exact bytes received.
    rawBody: true,
  });
  // Behind nginx or a load balancer, rate limits must see the real client IP, not the proxy's.
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
  });

  // Interactive docs at /docs; the raw OpenAPI JSON at /docs-json can be
  // imported straight into Postman (Import -> Link).
  if (swaggerEnabled()) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NeuroSpark X API')
      .setDescription('Backend API for the NeuroSpark X website and admin portal.')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'access-token')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig), {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(PORT);

  Logger.log(`Server running on ${PORT}`);
}
await bootstrap();
