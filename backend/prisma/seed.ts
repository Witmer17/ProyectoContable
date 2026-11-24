import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OperacionesService } from '../src/operaciones/operaciones.service';
import { CATALOGO, nivelDe } from '../src/cuentas/catalogo';

/**
 * Carga: usuarios, catálogo PCGE, empresa DEMO SAC (perfil comercial) y la apertura demo simple
 * (sección 9). Los datos de prueba más completos están en test/ y se cargan con `npm run seed:completo`.
 */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const ops = app.get(OperacionesService);

  const pass = process.env.SEED_USER_PASSWORD;
  if (!pass || pass.length < 8) throw new Error('Defina SEED_USER_PASSWORD (mínimo 8 caracteres) en el entorno');
  const hash = await bcrypt.hash(pass, 10);
  const usuarios = [
    ['admin@demo.pe', 'Administrador', 'ADMINISTRADOR'], ['contador@demo.pe', 'Contador', 'CONTADOR'],
    ['auxiliar@demo.pe', 'Auxiliar', 'AUXILIAR'], ['lectura@demo.pe', 'Lectura', 'LECTURA'],
  ] as const;
  for (const [email, nombre, rol] of usuarios) await prisma.usuario.upsert({ where: { email }, update: {}, create: { email, nombre, rol, passwordHash: hash } });

  for (const c of CATALOGO) {
    const data = {
      nombre: c.nombre, elemento: Number(c.codigo[0]), naturaleza: c.naturaleza, nivel: nivelDe(c.codigo), ultimoNivel: true,
      requiereDestino: c.requiereDestino ?? false, destinoDefecto: c.destinoDefecto, perfiles: c.perfiles ?? [], modulo: c.modulo ?? null,
    };
    await prisma.cuenta.upsert({ where: { codigo: c.codigo }, update: data, create: { codigo: c.codigo, ...data } });
  }

  if ((process.env.SEED_DEMO ?? 'true') !== 'true' || (await prisma.empresa.findUnique({ where: { id: 1 } }))) {
    console.log('Seed base listo (sin datos demo).');
    await app.close();
    return;
  }

  await prisma.empresa.create({ data: { id: 1, ruc: '20000000001', razonSocial: 'DEMO SAC', actividad: 'COMERCIAL', perfil: 'TIENDA', configurada: true } });
  const anio = new Date().getUTCFullYear();
  const [a, b, c] = await Promise.all([
    prisma.producto.create({ data: { codigo: 'PA', nombre: 'Producto A (DEMO)' } }),
    prisma.producto.create({ data: { codigo: 'PB', nombre: 'Producto B (DEMO)' } }),
    prisma.producto.create({ data: { codigo: 'PC', nombre: 'Producto C (DEMO)' } }),
  ]);
  await prisma.tercero.create({ data: { tipo: 'PROVEEDOR', tipoDoc: 'RUC', documento: '20111111111', nombre: 'Proveedor 1 (DEMO)' } });
  await prisma.tercero.create({ data: { tipo: 'CLIENTE', tipoDoc: 'DNI', documento: '12345678', nombre: 'Cliente 1 (DEMO)' } });

  const admin = await prisma.usuario.findUniqueOrThrow({ where: { email: 'admin@demo.pe' } });
  await ops.registrar(
    {
      tipo: 'APERTURA', fecha: `${anio}-01-01`, glosa: 'Asiento de apertura DEMO',
      lineas: [
        { cuenta: '101', debe: 10000 }, { cuenta: '1041', debe: 20000 }, { cuenta: '20111', debe: 5000 }, { cuenta: '501', haber: 35000 },
      ],
      existencias: [{ productoId: a.id, cantidad: 100, costoTotal: 5000 }],
    },
    { id: admin.id, rol: 'ADMINISTRADOR' },
  );
  void b; void c;
  console.log(`Seed listo: DEMO SAC con apertura al 01/01/${anio}. Usuarios: admin@demo.pe, contador@demo.pe, auxiliar@demo.pe, lectura@demo.pe`);
  await app.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
