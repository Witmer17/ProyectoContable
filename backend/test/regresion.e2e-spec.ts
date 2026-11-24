import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configurar } from '../src/configurar';
import { PrismaService } from '../src/prisma/prisma.service';
import { CATALOGO, nivelDe } from '../src/cuentas/catalogo';

// Requiere una base vacía dedicada a pruebas (el nombre debe terminar en _test o _verif): se borra todo su contenido.
const url = process.env.E2E_DATABASE_URL ?? '';
const seguro = /\/[\w-]*(_test|_verif)(\?.*)?$/.test(url);
const describeDb = seguro ? describe : describe.skip;

describeDb('Operaciones de regresión (LOS SISTEMÁTICOS EIRL) vía API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const post = (ruta: string, cuerpo: any, rol = 'admin') => http().post(`/api${ruta}`).set('Authorization', `Bearer ${tokens[rol]}`).send(cuerpo);
  const get = (ruta: string, rol = 'admin') => http().get(`/api${ruta}`).set('Authorization', `Bearer ${tokens[rol]}`);
  const put = (ruta: string, cuerpo: any, rol = 'admin') => http().put(`/api${ruta}`).set('Authorization', `Bearer ${tokens[rol]}`).send(cuerpo);
  const ids: Record<string, number> = {};
  const linea = (r: any, cuenta: string, etapa?: string) => r.body.lineas.filter((l: any) => l.cuenta === cuenta && (!etapa || l.etapa === etapa));
  const suma = (r: any, cuenta: string, lado: 'debe' | 'haber', etapa?: string) => Math.round(linea(r, cuenta, etapa).reduce((s: number, l: any) => s + l[lado], 0) * 100) / 100;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = 'secreto-de-prueba';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configurar(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(`TRUNCATE "Auditoria","Pago","Documento","AsientoLinea","Asiento","KardexMov","Producto","ActivoFijo","Tercero","Periodo","TipoCambio","Empresa","Usuario","Cuenta" RESTART IDENTITY CASCADE`);
    for (const c of CATALOGO) {
      await prisma.cuenta.create({ data: { codigo: c.codigo, nombre: c.nombre, elemento: Number(c.codigo[0]), naturaleza: c.naturaleza, nivel: nivelDe(c.codigo), requiereDestino: c.requiereDestino ?? false, perfiles: c.perfiles ?? [], modulo: c.modulo ?? null } });
    }
    const hash = await bcrypt.hash('Prueba123', 4);
    for (const [k, rol] of [['admin', 'ADMINISTRADOR'], ['contador', 'CONTADOR'], ['auxiliar', 'AUXILIAR'], ['lectura', 'LECTURA']] as const) {
      await prisma.usuario.create({ data: { email: `${k}@t.pe`, nombre: k, rol, passwordHash: hash } });
      const r = await http().post('/api/auth/login').send({ email: `${k}@t.pe`, password: 'Prueba123' });
      tokens[k] = r.body.token;
    }
  });
  afterAll(async () => { await app?.close(); });

  it('exige autenticación y respeta los roles', async () => {
    await http().get('/api/empresa').expect(401);
    await get('/empresa', 'lectura').expect(200);
    await put('/empresa/perfil', {}, 'contador').expect(403); // configuración: solo administrador
  });

  it('configura el perfil de la empresa y filtra las cuentas', async () => {
    await put('/empresa/datos', { ruc: '20123456789', razonSocial: 'LOS SISTEMÁTICOS EIRL' }).expect(200);
    const r = await put('/empresa/perfil', { actividad: 'COMERCIAL', tienePlanilla: false, tieneActivos: true, usaDolares: true, recibeHonorarios: false }).expect(200);
    expect(r.body.empresa.modulos.kardex).toBe(true);
    const cuentas = (await get('/cuentas')).body.map((c: any) => c.codigo);
    expect(cuentas).toContain('6011');
    expect(cuentas).not.toContain('702'); // empresa comercial
    expect(cuentas).not.toContain('6211'); // sin planilla
    expect((await get('/cuentas?grupo=63')).body.every((c: any) => c.codigo.startsWith('63'))).toBe(true);
    expect((await get('/cuentas/6011')).body.nombre).toMatch(/Mercader/);
    await get('/cuentas/9999').expect(404);
    await post('/operaciones/previsualizar', { tipo: 'PLANILLA', fecha: '2026-03-01' }, 'contador').expect(422); // módulo oculto
  });

  it('crea terceros con validación de RUC/DNI y productos', async () => {
    await post('/terceros', { tipo: 'PROVEEDOR', tipoDoc: 'RUC', documento: '30111111111', nombre: 'X' }).expect(422);
    await post('/terceros', { tipo: 'CLIENTE', tipoDoc: 'DNI', documento: '123', nombre: 'X' }).expect(422);
    for (const [clave, tipo, tipoDoc, documento, nombre] of [
      ['socio', 'SOCIO', 'DNI', '40000001', 'Socio Uno'], ['prov', 'PROVEEDOR', 'RUC', '20555555551', 'Lobitos S.A.'],
      ['cli', 'CLIENTE', 'RUC', '20666666661', 'Logitec SAC'], ['conc', 'PROVEEDOR', 'RUC', '20777777771', 'SEDAPAL'],
    ]) ids[clave] = (await post('/terceros', { tipo, tipoDoc, documento, nombre }, 'auxiliar').expect(201)).body.id;
    for (const [clave, codigo, nombre] of [['parlante', 'PAR', 'Parlante'], ['cpu', 'CPU', 'CPU'], ['audi', 'AUD', 'Audífono']]) {
      ids[clave] = (await post('/productos', { codigo, nombre }).expect(201)).body.id;
    }
    await post('/productos', { codigo: 'CPU', nombre: 'dup' }).expect(422);
  });

  const registrar = (cuerpo: any, rol = 'admin') => post('/operaciones', { fecha: '2026-03-10', ...cuerpo }, rol);
  const total = (r: any) => r.body.montos;

  it('op 1: aporte inicial 15,000 en efectivo', async () => {
    const r = await registrar({ tipo: 'APORTE_CAPITAL', terceroId: ids.socio, tipoAporte: 'DINERO', monto: 15000, medio: 'EFECTIVO' }).expect(201);
    expect(suma(r, '101', 'debe')).toBe(15000);
    expect(suma(r, '501', 'haber')).toBe(15000);
  });

  it('op 2: 20 parlantes a crédito, 780 + IGV c/u', async () => {
    const r = await registrar({ tipo: 'COMPRA_MERCADERIA', terceroId: ids.prov, serie: 'F002', numero: '654373', modoIgv: 'MAS', condicion: 'CREDITO', items: [{ productoId: ids.parlante, cantidad: 20, monto: 15600 }] }).expect(201);
    expect(total(r)).toEqual({ base: 15600, igv: 2808, total: 18408 });
    expect(suma(r, '20111', 'debe', 'DESTINO')).toBe(15600);
    expect(r.body.glosa).toBe('Por la compra según factura F002-654373 de Lobitos S.A.');
  });

  it('rechaza un comprobante repetido con el mensaje de la sección 7', async () => {
    const r = await post('/operaciones/previsualizar', { tipo: 'COMPRA_MERCADERIA', fecha: '2026-03-10', terceroId: ids.prov, serie: 'F002', numero: '654373', monto: 100 }).expect(422);
    expect(r.body.campo).toBe('numero');
    expect(r.body.message).toBe('Este número ya fue registrado el 10/03/2026 para Lobitos S.A.');
  });

  it('op 3: 25 CPU al contado, 1,750 c/u incluido IGV', async () => {
    const r = await registrar({ tipo: 'COMPRA_MERCADERIA', terceroId: ids.prov, serie: 'F001', numero: '1', items: [{ productoId: ids.cpu, cantidad: 25, monto: 43750 }] }).expect(201);
    expect(total(r)).toEqual({ base: 37076.27, igv: 6673.73, total: 43750 });
    expect(suma(r, '101', 'haber', 'CANCELACION')).toBe(43750);
  });

  it('op 4: publicidad 1,150 incluido IGV, pagada', async () => {
    const r = await registrar({ tipo: 'PAGO_SERVICIO', terceroId: ids.conc, serie: 'F010', numero: '1', cuenta: '6371', monto: 1150 }).expect(201);
    expect(total(r)).toEqual({ base: 974.58, igv: 175.42, total: 1150 });
    expect(suma(r, '95', 'debe', 'DESTINO')).toBe(974.58);
  });

  it('op 5: laptop en dólares, 1,320 incluido IGV, TC 3.446 (sin costo)', async () => {
    const r = await registrar({ tipo: 'COMPRA_MERCADERIA', terceroId: ids.prov, serie: 'F003', numero: '5', monto: 1320, moneda: 'USD', tipoCambio: 3.446, condicion: 'CREDITO' }).expect(201);
    expect(total(r)).toEqual({ base: 3854.85, igv: 693.87, total: 4548.72 });
  });

  it('op 6: camioneta 37,350 + IGV en dólares, TC 3.436, sin destino', async () => {
    const r = await registrar({ tipo: 'COMPRA_ACTIVO', terceroId: ids.prov, serie: 'F004', numero: '6', cuenta: '3341', concepto: 'Camioneta', monto: 37350, modoIgv: 'MAS', moneda: 'USD', tipoCambio: 3.436 }).expect(201);
    expect(total(r)).toEqual({ base: 128334.6, igv: 23100.23, total: 151434.83 });
    expect(r.body.lineas.some((l: any) => l.etapa === 'DESTINO')).toBe(false);
    expect(await prisma.activoFijo.count()).toBe(1);
  });

  it('op 7: 3 estantes al contado, 1,825 c/u incluido IGV', async () => {
    const r = await registrar({ tipo: 'COMPRA_ACTIVO', terceroId: ids.prov, serie: 'F005', numero: '7', cuenta: '3351', concepto: 'Estantes', monto: 5475, condicion: 'CONTADO_EFECTIVO' }).expect(201);
    expect(total(r)).toEqual({ base: 4639.83, igv: 835.17, total: 5475 });
    expect(suma(r, '3351', 'debe')).toBe(4639.83);
  });

  it('op 8: venta de 10 CPU a crédito, 2,395 c/u; costo del kárdex', async () => {
    const r = await registrar({ tipo: 'VENTA_MERCADERIA', terceroId: ids.cli, serie: 'F001', numero: '100', condicion: 'CREDITO', items: [{ productoId: ids.cpu, cantidad: 10, monto: 23950 }] }).expect(201);
    expect(total(r)).toEqual({ base: 20296.61, igv: 3653.39, total: 23950 });
    expect(suma(r, '6911', 'debe')).toBe(14830.51);
    ids.facturaCpu = r.body.documentoId;
  });

  it('op 9: agua 2,987 incluido IGV, pagada', async () => {
    const r = await registrar({ tipo: 'PAGO_SERVICIO', terceroId: ids.conc, serie: 'F011', numero: '9', cuenta: '6363', monto: 2987 }).expect(201);
    expect(total(r)).toEqual({ base: 2531.36, igv: 455.64, total: 2987 });
    expect(suma(r, '94', 'debe', 'DESTINO')).toBe(2531.36);
  });

  it('op 10: 400 audífonos al contado, 176 c/u incluido IGV', async () => {
    const r = await registrar({ tipo: 'COMPRA_MERCADERIA', terceroId: ids.prov, serie: 'F006', numero: '10', items: [{ productoId: ids.audi, cantidad: 400, monto: 70400 }] }).expect(201);
    expect(total(r)).toEqual({ base: 59661.02, igv: 10738.98, total: 70400 });
    expect(suma(r, '20111', 'debe', 'DESTINO')).toBe(59661.02);
  });

  it('op 11: 100 audífonos a Logitec al contado, 220 c/u incluido IGV', async () => {
    const r = await registrar({ tipo: 'VENTA_MERCADERIA', terceroId: ids.cli, serie: 'F001', numero: '101', items: [{ productoId: ids.audi, cantidad: 100, monto: 22000 }] }).expect(201);
    expect(total(r)).toEqual({ base: 18644.07, igv: 3355.93, total: 22000 });
    expect(suma(r, '6911', 'debe')).toBe(14915.25);
    expect(suma(r, '101', 'debe', 'CANCELACION')).toBe(22000);
  });

  it('op 12: aumento de capital 150,000', async () => {
    const r = await registrar({ tipo: 'APORTE_CAPITAL', terceroId: ids.socio, tipoAporte: 'DINERO', monto: 150000, medio: 'EFECTIVO', aumento: true }).expect(201);
    expect(suma(r, '5221', 'haber')).toBe(150000);
  });

  it('el balance de comprobación cuadra y los estados financieros coinciden', async () => {
    const bal = (await get('/reportes/balance-comprobacion')).body;
    expect(bal.resumen.cuadra).toBe(true);
    expect(bal.totales.debe).toBe(bal.totales.haber);
    const sit = (await get('/reportes/situacion-financiera')).body;
    expect(sit.resumen.cuadra).toBe(true);
    const res = (await get('/reportes/estado-resultados')).body;
    const resultadoSit = sit.filas.find((f: any) => f.concepto.startsWith('Resultado del periodo')).monto;
    expect(res.resumen.utilidad).toBe(resultadoSit);
  });

  it('no vende más stock del que hay', async () => {
    const r = await post('/operaciones/previsualizar', { tipo: 'VENTA_MERCADERIA', fecha: '2026-03-11', terceroId: ids.cli, serie: 'F001', numero: '200', items: [{ productoId: ids.cpu, cantidad: 999, monto: 100 }] }).expect(422);
    expect(r.body.campo).toBe('items');
    expect(r.body.message).toMatch(/stock suficiente/);
  });

  it('cobranza: no cobra más de lo pendiente y actualiza el saldo', async () => {
    const mal = await post('/operaciones/previsualizar', { tipo: 'COBRANZA', fecha: '2026-03-20', terceroId: ids.cli, documentoId: ids.facturaCpu, monto: 99999 }).expect(422);
    expect(mal.body.campo).toBe('monto');
    await registrar({ tipo: 'COBRANZA', fecha: '2026-03-20', terceroId: ids.cli, documentoId: ids.facturaCpu, monto: 10000, medio: 'EFECTIVO' }).expect(201);
    const cxc = (await get('/reportes/pendientes/por-cobrar')).body;
    expect(cxc.totales.saldo).toBe(13950);
  });

  it('el auxiliar registra documentos pero no asientos manuales; la lectura no registra', async () => {
    await post('/operaciones', { tipo: 'MANUAL', fecha: '2026-03-12', glosa: 'x', lineas: [] }, 'auxiliar').expect(403);
    await post('/operaciones/previsualizar', { tipo: 'PAGO_SERVICIO', fecha: '2026-03-12', terceroId: ids.conc, serie: 'F012', numero: '1', cuenta: '6363', monto: 100 }, 'auxiliar').expect(201);
    await post('/operaciones/previsualizar', { tipo: 'PAGO_SERVICIO', fecha: '2026-03-12' }, 'lectura').expect(403);
  });

  it('asiento manual: exige cuadre, cuentas de último nivel y destino para gastos 62-68', async () => {
    const base = { tipo: 'MANUAL', fecha: '2026-03-12', glosa: 'Prueba' };
    const nc = await post('/operaciones', { ...base, lineas: [{ cuenta: '101', debe: 100 }, { cuenta: '501', haber: 90 }] }, 'contador').expect(422);
    expect(nc.body.message).toMatch(/No cuadra/);
    await post('/operaciones', { ...base, lineas: [{ cuenta: '101', debe: 100 }, { cuenta: '12345', haber: 100 }] }, 'contador').expect(422);
    const sd = await post('/operaciones', { ...base, lineas: [{ cuenta: '6391', debe: 100 }, { cuenta: '101', haber: 100 }] }, 'contador').expect(422);
    expect(sd.body.message).toMatch(/destino/);
    await post('/operaciones', { ...base, lineas: [{ cuenta: '6391', debe: 100 }, { cuenta: '101', haber: 100 }, { cuenta: '94', debe: 100 }, { cuenta: '791', haber: 100 }] }, 'contador').expect(201);
  });

  it('liquidación de IGV del mes', async () => {
    const r = await registrar({ tipo: 'LIQUIDACION_IGV', fecha: '2026-03-31' }).expect(201);
    expect(r.body.totales.cuadra).toBe(true);
    await post('/operaciones/previsualizar', { tipo: 'LIQUIDACION_IGV', fecha: '2026-03-31' }).expect(422); // ya liquidado
    const igv = (await get('/reportes/liquidacion-igv?periodo=2026-03')).body;
    expect(igv.resumen.igvVentas).toBeCloseTo(3653.39 + 3355.93, 2);
  });

  it('depreciación del mes siguiente a la compra', async () => {
    const r = await registrar({ tipo: 'DEPRECIACION', fecha: '2026-04-30' }).expect(201);
    expect(r.body.totales.cuadra).toBe(true);
    expect(suma(r, '3913', 'haber')).toBeCloseTo((128334.6 * 0.2) / 12, 2);
  });

  it('anular genera reversión, no borra y revierte el kárdex', async () => {
    const compra = await registrar({ tipo: 'COMPRA_MERCADERIA', fecha: '2026-04-05', terceroId: ids.prov, serie: 'F007', numero: '77', items: [{ productoId: ids.parlante, cantidad: 5, monto: 590 }] }).expect(201);
    const antes = (await get('/productos')).body.find((p: any) => p.id === ids.parlante).stock;
    const r = await post(`/asientos/${compra.body.asientoId}/anular`, { motivo: 'Error de digitación' }, 'contador').expect(201);
    expect(r.body.reversion).toBeGreaterThan(0);
    const despues = (await get('/productos')).body.find((p: any) => p.id === ids.parlante).stock;
    expect(antes - despues).toBe(5);
    expect(await prisma.asiento.count({ where: { id: compra.body.asientoId } })).toBe(1);
    await post(`/asientos/${compra.body.asientoId}/anular`, { motivo: 'otra vez' }, 'contador').expect(422);
    expect((await get('/reportes/balance-comprobacion')).body.resumen.cuadra).toBe(true);
  });

  it('un periodo cerrado no admite cambios; solo el administrador reabre con motivo', async () => {
    await post('/periodos/2026/3/cerrar', { password: 'incorrecta' }, 'contador').expect(401);
    await post('/periodos/2026/3/cerrar', { password: 'Prueba123' }, 'contador').expect(201);
    const r = await post('/operaciones', { tipo: 'PAGO_SERVICIO', fecha: '2026-03-15', terceroId: ids.conc, serie: 'F013', numero: '1', cuenta: '6363', monto: 100 }, 'contador').expect(422);
    expect(r.body.message).toMatch(/cerrado/);
    await post('/operaciones', { tipo: 'MANUAL', fecha: '2026-03-15', glosa: 'x', lineas: [{ cuenta: '101', debe: 1 }, { cuenta: '501', haber: 1 }] }, 'contador').expect(422);
    await post('/periodos/2026/3/reabrir', { password: 'Prueba123', motivo: 'Corrección' }, 'contador').expect(403);
    await post('/periodos/2026/3/reabrir', { password: 'Prueba123', motivo: 'Corrección' }).expect(201);
  });

  it('exporta reportes a Excel y PDF', async () => {
    const x = await get('/reportes/libro-diario?formato=xlsx').expect(200);
    expect(x.header['content-type']).toMatch(/spreadsheetml/);
    const p = await get('/reportes/libro-mayor?formato=pdf').expect(200);
    expect(p.header['content-type']).toMatch(/pdf/);
    expect((await get('/respaldo')).body.asientos.length).toBeGreaterThan(10);
  });

  it('cierre anual: regulariza, cierra, abre el año siguiente y bloquea los meses', async () => {
    const r = await post('/periodos/cierre-anual/2026', { password: 'Prueba123' }, 'contador').expect(201);
    expect(r.body.apertura).toBeGreaterThan(0);
    const bal = (await get('/reportes/balance-comprobacion?desde=2026-01-01&hasta=2026-12-31')).body;
    expect(bal.resumen.cuadra).toBe(true);
    const abre = (await get('/reportes/balance-comprobacion?desde=2027-01-01&hasta=2027-01-31')).body;
    expect(abre.resumen.cuadra).toBe(true);
    expect(abre.filas.find((f: any) => f.cuenta === '591' || f.cuenta === '592')).toBeTruthy();
    await post('/periodos/cierre-anual/2026', { password: 'Prueba123' }, 'contador').expect(422);
  });
});
