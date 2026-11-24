import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurar } from './configurar';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configurar(app);
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
bootstrap();
