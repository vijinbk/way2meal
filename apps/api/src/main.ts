import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { AppConfig } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(AppConfig);
  configureApp(app, { swagger: config.env.SWAGGER_ENABLED ?? !config.isProduction });
  await app.listen(config.env.PORT);
  Logger.log(`API listening on :${config.env.PORT} (docs at /docs)`, 'Bootstrap');
}

void bootstrap();
