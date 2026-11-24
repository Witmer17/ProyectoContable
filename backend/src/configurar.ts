import { INestApplication, ValidationPipe, HttpException } from '@nestjs/common';

/** Configuración común de la aplicación (main y pruebas e2e). */
export function configurar(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errores) => {
        const e = errores[0];
        return new HttpException({ statusCode: 422, campo: e.property, message: Object.values(e.constraints ?? { x: 'Dato no válido' })[0] }, 422);
      },
    }),
  );
  const origenes = (process.env.CORS_ORIGINS ?? 'http://localhost:4200').split(',');
  app.enableCors({ origin: origenes });
  app.setGlobalPrefix('api');
}
