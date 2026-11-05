import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

/** Shared by main.ts and integration tests so both run the same HTTP pipeline. */
export function configureApp(app: NestExpressApplication, opts: { swagger?: boolean } = {}): void {
  app.set('trust proxy', 1);
  app.setGlobalPrefix('v1');
  app.enableCors();
  app.enableShutdownHooks();

  if (opts.swagger) {
    const config = new DocumentBuilder()
      .setTitle('Way2meal API')
      .setVersion('1')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, cleanupOpenApiDoc(SwaggerModule.createDocument(app, config)));
  }
}
