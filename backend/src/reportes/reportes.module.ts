import { Controller, Get, Module, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { Roles, TODOS } from '../common/roles';
import { fechaDate } from '../common/errores';
import { EmpresaModule, EmpresaService } from '../empresa/empresa.module';
import { aExcel, aPdf, Columna, Reporte } from './exportar';
import { r2, saldoDeudor, sumasPorCuenta } from './saldos';

const dia = (d: Date) => d.toISOString().slice(0, 10);
const T = (key: string, titulo: string): Columna => ({ key, titulo });
const N = (key: string, titulo: string): Columna => ({ key, titulo, tipo: 'num' });

@Controller('reportes')
@Roles(...TODOS)
export class ReportesController {
  constructor(private prisma: PrismaService, private empresa: EmpresaService) {}

  /** Entrega el reporte como JSON o, con ?formato=xlsx|pdf, como archivo. */
  private async salida(r: Reporte, formato: string | undefined, res: Response, nombre: string) {
    if (formato === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${nombre}.xlsx"`);
      return res.send(await aExcel(r));
    }
    if (formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nombre}.pdf"`);
      return res.send(await aPdf(r));
    }
    return res.json(r);
  }

  private async sub(desde?: string, hasta?: string) {
    const e = await this.empresa.obtener();
    return `${e?.razonSocial ?? ''} · RUC ${e?.ruc ?? ''} · ${desde ?? 'inicio'} al ${hasta ?? 'hoy'}`;
  }

  @Get('libro-diario')
  async diario(@Res() res: Response, @Query('desde') desde?: string, @Query('hasta') hasta?: string, @Query('operacion') operacion?: string, @Query('formato') formato?: string) {
    const ls = await this.prisma.asientoLinea.findMany({
      where: { asiento: { ...(desde || hasta ? { fecha: { ...(desde ? { gte: fechaDate(desde) } : {}), ...(hasta ? { lte: fechaDate(hasta) } : {}) } } : {}), ...(operacion ? { operacion } : {}) } },
      include: { asiento: true, cuenta: true },
      orderBy: [{ asiento: { fecha: 'asc' } }, { asiento: { numero: 'asc' } }, { orden: 'asc' }],
    });
    const filas = ls.map((l) => ({ numero: l.asiento.numero, fecha: dia(l.asiento.fecha), operacion: l.asiento.operacion, glosa: l.orden === 1 ? l.asiento.glosa + (l.asiento.estado === 'ANULADO' ? ' [ANULADO]' : '') : '', cuenta: l.cuentaCodigo, nombre: l.cuenta.nombre, debe: Number(l.debe), haber: Number(l.haber) }));
    const totales = { nombre: 'TOTAL', debe: r2(filas.reduce((s, f) => s + f.debe, 0)), haber: r2(filas.reduce((s, f) => s + f.haber, 0)) };
    return this.salida({ titulo: 'Libro Diario', subtitulo: await this.sub(desde, hasta), columnas: [T('numero', 'N.º'), T('fecha', 'Fecha'), T('operacion', 'Operación'), T('glosa', 'Glosa'), T('cuenta', 'Cuenta'), T('nombre', 'Nombre'), N('debe', 'Debe'), N('haber', 'Haber')], filas, totales }, formato, res, 'libro-diario');
  }

  @Get('libro-mayor')
  async mayor(@Res() res: Response, @Query('desde') desde?: string, @Query('hasta') hasta?: string, @Query('cuenta') cuenta?: string, @Query('formato') formato?: string) {
    const ls = await this.prisma.asientoLinea.findMany({
      where: { ...(cuenta ? { cuentaCodigo: cuenta } : {}), asiento: { ...(desde || hasta ? { fecha: { ...(desde ? { gte: fechaDate(desde) } : {}), ...(hasta ? { lte: fechaDate(hasta) } : {}) } } : {}) } },
      include: { asiento: true, cuenta: true },
      orderBy: [{ cuentaCodigo: 'asc' }, { asiento: { fecha: 'asc' } }, { asiento: { numero: 'asc' } }, { orden: 'asc' }],
    });
    const saldo = new Map<string, number>();
    const filas = ls.map((l) => {
      const deudora = l.cuenta.naturaleza === 'DEUDORA';
      const s = r2((saldo.get(l.cuentaCodigo) ?? 0) + (deudora ? 1 : -1) * (Number(l.debe) - Number(l.haber)));
      saldo.set(l.cuentaCodigo, s);
      return { cuenta: l.cuentaCodigo, nombre: l.cuenta.nombre, fecha: dia(l.asiento.fecha), numero: l.asiento.numero, glosa: l.asiento.glosa, debe: Number(l.debe), haber: Number(l.haber), saldo: s };
    });
    return this.salida({ titulo: 'Libro Mayor', subtitulo: await this.sub(desde, hasta), columnas: [T('cuenta', 'Cuenta'), T('nombre', 'Nombre'), T('fecha', 'Fecha'), T('numero', 'Asiento'), T('glosa', 'Glosa'), N('debe', 'Debe'), N('haber', 'Haber'), N('saldo', 'Saldo acumulado')], filas }, formato, res, 'libro-mayor');
  }

  @Get('balance-comprobacion')
  async balance(@Res() res: Response, @Query('desde') desde?: string, @Query('hasta') hasta?: string, @Query('formato') formato?: string) {
    const ss = await sumasPorCuenta(this.prisma, desde ?? null, hasta ?? null);
    const filas = ss.map((s) => { const sd = saldoDeudor(s); return { cuenta: s.cuenta, nombre: s.nombre, debe: r2(s.debe), haber: r2(s.haber), saldoDeudor: sd > 0 ? sd : 0, saldoAcreedor: sd < 0 ? -sd : 0 }; });
    const sum = (k: string) => r2(filas.reduce((a, f: any) => a + f[k], 0));
    const totales = { nombre: 'TOTAL', debe: sum('debe'), haber: sum('haber'), saldoDeudor: sum('saldoDeudor'), saldoAcreedor: sum('saldoAcreedor') };
    return this.salida({ titulo: 'Balance de comprobación', subtitulo: await this.sub(desde, hasta), columnas: [T('cuenta', 'Cuenta'), T('nombre', 'Nombre'), N('debe', 'Debe'), N('haber', 'Haber'), N('saldoDeudor', 'Saldo deudor'), N('saldoAcreedor', 'Saldo acreedor')], filas, totales, resumen: { cuadra: totales.debe === totales.haber && totales.saldoDeudor === totales.saldoAcreedor } }, formato, res, 'balance-comprobacion');
  }

  @Get('estado-resultados')
  async resultados(@Res() res: Response, @Query('desde') desde?: string, @Query('hasta') hasta?: string, @Query('formato') formato?: string) {
    const ss = await sumasPorCuenta(this.prisma, desde ?? null, hasta ?? null);
    const acreedor = (pref: RegExp) => r2(ss.filter((s) => pref.test(s.cuenta)).reduce((a, s) => a - saldoDeudor(s), 0));
    const deudor = (pref: RegExp) => r2(ss.filter((s) => pref.test(s.cuenta)).reduce((a, s) => a + saldoDeudor(s), 0));
    const ventas = acreedor(/^70[^9]/), devol = deudor(/^709/), rebajas = deudor(/^74/);
    const ventasNetas = r2(ventas - devol - rebajas); // 709 y 74 se restan aparte
    const costo = deudor(/^69/);
    const bruta = r2(ventasNetas - costo);
    const g94 = deudor(/^94$/), g95 = deudor(/^95$/), g97 = deudor(/^97$/), g92 = deudor(/^92$/);
    const otrosIng = r2(acreedor(/^7[5-8]/));
    // Gastos de clase 6 que ningún destino (94/95/97/92) imputó, p. ej. 655
    const gastos6 = deudor(/^6/) - costo; // incluye compras y variación de existencias, que se anulan entre sí
    const imputado = acreedor(/^79/);
    const otros = r2(gastos6 - imputado);
    const utilidad = r2(bruta - g94 - g95 - g97 - g92 - otros + otrosIng);
    const filas = [
      { concepto: 'Ventas', monto: ventas }, { concepto: '(-) Devoluciones y rebajas', monto: r2(devol + rebajas) }, { concepto: 'Ventas netas', monto: ventasNetas, negrita: true },
      { concepto: '(-) Costo de ventas', monto: costo }, { concepto: 'Utilidad bruta', monto: bruta, negrita: true },
      { concepto: '(-) Gastos de administración (94)', monto: g94 }, { concepto: '(-) Gastos de ventas (95)', monto: g95 }, { concepto: '(-) Gastos financieros (97)', monto: g97 }, { concepto: '(-) Costos de producción por transferir (92)', monto: g92 },
      { concepto: '(-) Otros gastos sin destino', monto: otros }, { concepto: '(+) Otros ingresos', monto: otrosIng },
      { concepto: 'UTILIDAD (PÉRDIDA) DEL PERIODO', monto: utilidad, negrita: true },
    ];
    return this.salida({ titulo: 'Estado de Resultados', subtitulo: await this.sub(desde, hasta), columnas: [T('concepto', 'Concepto'), N('monto', 'Monto S/')], filas, resumen: { utilidad } }, formato, res, 'estado-resultados');
  }

  @Get('situacion-financiera')
  async situacion(@Res() res: Response, @Query('hasta') hasta?: string, @Query('formato') formato?: string) {
    const ss = await sumasPorCuenta(this.prisma, null, hasta ?? null);
    const de = (els: number[], signo: 1 | -1) => ss.filter((s) => els.includes(s.elemento)).map((s) => ({ cuenta: s.cuenta, nombre: s.nombre, monto: r2(signo * saldoDeudor(s)) })).filter((x) => x.monto !== 0);
    const activo = de([1, 2, 3], 1), pasivo = de([4], -1), patrimonio = de([5], -1);
    const resultado = r2(-ss.filter((s) => [6, 7, 8, 9].includes(s.elemento)).reduce((a, s) => a + saldoDeudor(s), 0));
    const t = (xs: { monto: number }[]) => r2(xs.reduce((a, x) => a + x.monto, 0));
    const tActivo = t(activo), tPasivo = t(pasivo), tPat = r2(t(patrimonio) + resultado);
    const filas: Record<string, any>[] = [
      { concepto: 'ACTIVO', negrita: true }, ...activo.map((x) => ({ concepto: `${x.cuenta} ${x.nombre}`, monto: x.monto })), { concepto: 'Total activo', monto: tActivo, negrita: true },
      { concepto: 'PASIVO', negrita: true }, ...pasivo.map((x) => ({ concepto: `${x.cuenta} ${x.nombre}`, monto: x.monto })), { concepto: 'Total pasivo', monto: tPasivo, negrita: true },
      { concepto: 'PATRIMONIO', negrita: true }, ...patrimonio.map((x) => ({ concepto: `${x.cuenta} ${x.nombre}`, monto: x.monto })), { concepto: 'Resultado del periodo (aún sin cerrar)', monto: resultado },
      { concepto: 'Total patrimonio', monto: tPat, negrita: true }, { concepto: 'Total pasivo + patrimonio', monto: r2(tPasivo + tPat), negrita: true },
    ];
    return this.salida({ titulo: 'Estado de Situación Financiera', subtitulo: await this.sub(undefined, hasta), columnas: [T('concepto', 'Concepto'), N('monto', 'Monto S/')], filas, resumen: { cuadra: tActivo === r2(tPasivo + tPat), activo: tActivo, pasivoPatrimonio: r2(tPasivo + tPat) } }, formato, res, 'situacion-financiera');
  }

  private async registro(sentido: 'COMPRA' | 'VENTA', desde?: string, hasta?: string) {
    const docs = await this.prisma.documento.findMany({
      where: { sentido, anulado: false, ...(desde || hasta ? { fecha: { ...(desde ? { gte: fechaDate(desde) } : {}), ...(hasta ? { lte: fechaDate(hasta) } : {}) } } : {}) },
      include: { tercero: true }, orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
    });
    const filas = docs.map((d) => ({ periodo: dia(d.fecha).slice(0, 7), fecha: dia(d.fecha), vencimiento: d.vencimiento ? dia(d.vencimiento) : '', tipo: d.tipo, serie: d.serie, numero: d.numero, tipoDoc: d.tercero.tipoDoc, documento: d.tercero.documento, nombre: d.tercero.nombre, base: Number(d.base), igv: Number(d.igv), total: Number(d.total), moneda: d.moneda, tc: Number(d.tipoCambio) }));
    const totales = { nombre: 'TOTAL', base: r2(filas.reduce((a, f) => a + f.base, 0)), igv: r2(filas.reduce((a, f) => a + f.igv, 0)), total: r2(filas.reduce((a, f) => a + f.total, 0)) };
    return { filas, totales, columnas: [T('periodo', 'Periodo'), T('fecha', 'Emisión'), T('vencimiento', 'Vence'), T('tipo', 'Tipo'), T('serie', 'Serie'), T('numero', 'Número'), T('tipoDoc', 'Doc.'), T('documento', 'N.º doc.'), T('nombre', sentido === 'COMPRA' ? 'Proveedor' : 'Cliente'), N('base', 'Base'), N('igv', 'IGV'), N('total', 'Total'), T('moneda', 'Mon.'), N('tc', 'T.C.')] };
  }

  @Get('registro-compras')
  async compras(@Res() res: Response, @Query('desde') desde?: string, @Query('hasta') hasta?: string, @Query('formato') formato?: string) {
    const r = await this.registro('COMPRA', desde, hasta);
    return this.salida({ titulo: 'Registro de Compras', subtitulo: await this.sub(desde, hasta), ...r }, formato, res, 'registro-compras');
  }

  @Get('registro-ventas')
  async ventas(@Res() res: Response, @Query('desde') desde?: string, @Query('hasta') hasta?: string, @Query('formato') formato?: string) {
    const r = await this.registro('VENTA', desde, hasta);
    return this.salida({ titulo: 'Registro de Ventas', subtitulo: await this.sub(desde, hasta), ...r }, formato, res, 'registro-ventas');
  }

  /** Saldo pendiente por tercero: `por-cobrar` (ventas) o `por-pagar` (compras). */
  @Get('pendientes/:cual')
  async pendientes(@Param('cual') cual: string, @Res() res: Response, @Query('formato') formato?: string) {
    const cobrar = cual === 'por-cobrar';
    const docs = await this.prisma.documento.findMany({ where: { sentido: cobrar ? 'VENTA' : 'COMPRA', anulado: false, saldo: { gt: 0 } }, include: { tercero: true }, orderBy: [{ tercero: { nombre: 'asc' } }, { fecha: 'asc' }] });
    const filas = docs.map((d) => ({ nombre: d.tercero.nombre, documento: d.tercero.documento, comprobante: `${d.tipo} ${d.serie}-${d.numero}`, fecha: dia(d.fecha), vencimiento: d.vencimiento ? dia(d.vencimiento) : '', id: d.id, terceroId: d.terceroId, total: Number(d.total), saldo: Number(d.saldo) }));
    return this.salida({ titulo: cobrar ? 'Cuentas por cobrar' : 'Cuentas por pagar', columnas: [T('nombre', cobrar ? 'Cliente' : 'Proveedor'), T('documento', 'Documento'), T('comprobante', 'Comprobante'), T('fecha', 'Emisión'), T('vencimiento', 'Vence'), N('total', 'Total'), N('saldo', 'Saldo')], filas, totales: { nombre: 'TOTAL', saldo: r2(filas.reduce((a, f) => a + f.saldo, 0)) } }, formato, res, cual);
  }

  @Get('kardex')
  async kardex(@Res() res: Response, @Query('productoId') productoId?: string, @Query('formato') formato?: string) {
    const movs = await this.prisma.kardexMov.findMany({ where: productoId ? { productoId: Number(productoId) } : {}, include: { producto: true }, orderBy: [{ productoId: 'asc' }, { fecha: 'asc' }, { id: 'asc' }] });
    const filas = movs.map((m) => ({ producto: `${m.producto.codigo} ${m.producto.nombre}`, fecha: dia(m.fecha), tipo: m.tipo === 'ENTRADA' ? 'Entrada' : 'Salida', cantidad: Number(m.cantidad), costoUnit: Number(m.costoUnit), costoTotal: Number(m.costoTotal), saldoCant: Number(m.saldoCant), saldoCosto: Number(m.saldoCosto) }));
    return this.salida({ titulo: 'Kárdex (costo promedio ponderado)', columnas: [T('producto', 'Producto'), T('fecha', 'Fecha'), T('tipo', 'Movimiento'), N('cantidad', 'Cantidad'), N('costoUnit', 'Costo unit.'), N('costoTotal', 'Costo total'), N('saldoCant', 'Saldo cant.'), N('saldoCosto', 'Saldo S/')], filas }, formato, res, 'kardex');
  }

  @Get('liquidacion-igv')
  async igv(@Res() res: Response, @Query('periodo') periodo: string, @Query('formato') formato?: string) {
    const [anio, mes] = periodo.split('-').map(Number);
    const desde = new Date(Date.UTC(anio, mes - 1, 1)), hasta = new Date(Date.UTC(anio, mes, 0));
    const docs = await this.prisma.documento.findMany({ where: { anulado: false, igv: { gt: 0 }, fecha: { gte: desde, lte: hasta } }, include: { tercero: true }, orderBy: [{ sentido: 'asc' }, { fecha: 'asc' }] });
    const filas = docs.map((d) => ({ tipo: d.sentido === 'VENTA' ? 'Venta (débito)' : 'Compra (crédito)', fecha: dia(d.fecha), comprobante: `${d.tipo} ${d.serie}-${d.numero}`, nombre: d.tercero.nombre, base: Number(d.base), igv: Number(d.igv) }));
    const v = r2(filas.filter((f) => f.tipo.startsWith('Venta')).reduce((a, f) => a + f.igv, 0)), c = r2(filas.filter((f) => f.tipo.startsWith('Compra')).reduce((a, f) => a + f.igv, 0));
    return this.salida({ titulo: `Liquidación de IGV ${periodo}`, subtitulo: await this.sub(dia(desde), dia(hasta)), columnas: [T('tipo', 'Tipo'), T('fecha', 'Fecha'), T('comprobante', 'Comprobante'), T('nombre', 'Tercero'), N('base', 'Base'), N('igv', 'IGV')], filas, totales: { nombre: v >= c ? `IGV a pagar` : 'Saldo a favor', igv: r2(Math.abs(v - c)) }, resumen: { igvVentas: v, igvCompras: c, saldo: r2(v - c) } }, formato, res, `igv-${periodo}`);
  }
}

@Module({ imports: [EmpresaModule], controllers: [ReportesController] })
export class ReportesModule {}
