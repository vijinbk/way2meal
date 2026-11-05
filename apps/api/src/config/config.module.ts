import { Global, Module } from '@nestjs/common';
import { AppConfig, parseEnv } from './env';

@Global()
@Module({
  providers: [{ provide: AppConfig, useFactory: () => new AppConfig(parseEnv(process.env)) }],
  exports: [AppConfig],
})
export class ConfigModule {}
