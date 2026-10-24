import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { securityHeaders } from './common/security-headers';

// Local dev reads apps/api/.env; in production the host provides the variables.
if (existsSync('.env')) process.loadEnvFile('.env');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Don't announce the framework; every response gets the API's security headers.
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(securityHeaders);

  // Browsers never call the API directly: the owner app proxies /api/* here,
  // so there is no CORS to configure.
  app.use(cookieParser());
  app.enableShutdownHooks();

  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap();
