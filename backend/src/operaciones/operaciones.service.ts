import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AsientosService, Tx } from '../asientos/asientos.service';
import { EmpresaService } from '../empresa/empresa.module';
import { modulosDe } from '../empresa/perfiles';
import { ErrorCampo, fechaDate } from '../common/errores';
import { OperacionDto } from './operaciones.dto';
import {
  aCentimos, aSoles, Area, calcularMontos, C, Condicion, convertirASoles, cuotaDepreciacion, entradaKardex, Linea, liquidacionIgv, Montos,
  PLANTILLAS, resumenPlanilla, retencionHonorarios, salidaKardex, SaldoKardex, totales, TASA_DEPRECIACION_DEFECTO,
  compraMercaderia, compraActivo, pagoServicio, honorarios, ventaMercaderia, ventaActivo, cobranza, pagoProveedor, planilla, aporteCapital, depreciacionMes,
  costoUnitario4,
} from '../motor-asientos';

const NOMBRE_COMPROBANTE: Record<string, string> = { '01': 'factura', '03': 'boleta', '07': 'nota de crédito', '08': 'nota de débito', RH: 'recibo por honorarios', OT: 'comprobante' };
const SERVICIOS_AREA_VENTAS = ['6371'];

interface MovKardex { productoId: number; tipo: 'ENTRADA' | 'SALIDA'; cantidad: number; costoTotal: number }

interface Plan {
  operacion: string;
  fecha: string;
  glosa: string;
  lineas: Linea[];
  notas: string[];
  montos?: Montos;
  documento?: { sentido: 'COMPRA' | 'VENTA'; tipo: string; serie: string; numero: string; terceroId: number; moneda: string; tipoCambio: number; base: number; igv: number; total: number; saldo: number; condicion: Condicion; vencimiento?: string };
  pagoAuto?: { monto: number; medio: 'EFECTIVO' | 'BANCO'; cuentaBancaria?: string };
  cobroPago?: { documentoId: number; monto: number; medio: 'EFECTIVO' | 'BANCO'; cuentaBancaria?: string };
  kardex: MovKardex[];
  activoNuevo?: { nombre: string; cuenta: string; fechaCompra: string; valor: number; tasaAnual: number };
  activoVendido?: number;
  depreciaciones?: { activoId: number; monto: number }[];
  apertura?: { pendientes: NonNullable<OperacionDto['pendientes']>; existencias: NonNullable<OperacionDto['existencias']>; activos: NonNullable<OperacionDto['activos']> };
}

const repartir = (total: number, pesos: number[]): number[] => {
  const suma = pesos.reduce((a, b) => a + b, 0);
  let acumP = 0, acumR = 0;
  return pesos.map((p, i) => {
    acumP += p;
    const objetivo = i === pesos.length - 1 ? total : Math.round((total * acumP) / suma);
    const parte = objetivo - acumR;
    acumR = objetivo;
    return parte;
  });
};

@Injectable()
export class OperacionesService {
  constructor(private prisma: PrismaService, private asientos: AsientosService, private empresaSvc: EmpresaService) {}

  // ───────────────────────────── API pública ─────────────────────────────

  /** Previsualización: calcula los asientos sin guardar nada. */
  async previsualizar(dto: OperacionDto) {
    const plan = await this.construir(dto, this.prisma);
    return this.vista(plan, this.prisma);
  }

  async registrar(dto: OperacionDto, usuario: { id: number; rol: string }) {
    if (dto.motivoPeriodoCerrado && usuario.rol !== 'ADMINISTRADOR') throw new ErrorCampo('motivoPeriodoCerrado', 'Solo el administrador puede registrar en un periodo cerrado');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7002)`; // serializa kárdex y saldos
      const plan = await this.construir(dto, tx);
      const asiento = await this.asientos.crear(tx, {
        fecha: plan.fecha, operacion: plan.operacion, glosa: plan.glosa, lineas: plan.lineas, usuarioId: usuario.id,
        forzarPeriodo: dto.motivoPeriodoCerrado ? { motivo: dto.motivoPeriodoCerrado } : undefined,
        sinDestino: plan.operacion === 'APERTURA',
      });
      let documentoId: number | undefined;
      if (plan.documento) {
        const dc = plan.documento;
        const doc = await tx.documento.create({
          data: {
            sentido: dc.sentido, tipo: dc.tipo, serie: dc.serie, numero: dc.numero, terceroId: dc.terceroId, fecha: fechaDate(plan.fecha), vencimiento: dc.vencimiento ? fechaDate(dc.vencimiento) : null,
            moneda: dc.moneda, tipoCambio: dc.tipoCambio, base: aSoles(dc.base), igv: aSoles(dc.igv), total: aSoles(dc.total), saldo: aSoles(dc.saldo), condicion: dc.condicion, operacion: plan.operacion, glosa: plan.glosa, asientoId: asiento.id,
          },
        });
        documentoId = doc.id;
        if (plan.pagoAuto) await tx.pago.create({ data: { documentoId: doc.id, fecha: fechaDate(plan.fecha), monto: aSoles(plan.pagoAuto.monto), medio: plan.pagoAuto.medio, cuentaBancaria: plan.pagoAuto.cuentaBancaria, asientoId: asiento.id } });
      }
      if (plan.cobroPago) {
        const cp = plan.cobroPago;
        await tx.pago.create({ data: { documentoId: cp.documentoId, fecha: fechaDate(plan.fecha), monto: aSoles(cp.monto), medio: cp.medio, cuentaBancaria: cp.cuentaBancaria, asientoId: asiento.id } });
        await tx.documento.update({ where: { id: cp.documentoId }, data: { saldo: { decrement: aSoles(cp.monto) } } });
      }
      for (const m of plan.kardex) await this.aplicarKardex(tx, m, plan.fecha, asiento.id);
      if (plan.activoNuevo) {
        const a = plan.activoNuevo;
        await tx.activoFijo.create({ data: { nombre: a.nombre, cuenta: a.cuenta, fechaCompra: fechaDate(a.fechaCompra), valor: aSoles(a.valor), tasaAnual: a.tasaAnual, vidaUtilMeses: Math.round(12 / a.tasaAnual), documentoId } });
      }
      if (plan.activoVendido) await tx.activoFijo.update({ where: { id: plan.activoVendido }, data: { estado: 'VENDIDO' } });
      for (const dp of plan.depreciaciones ?? []) await tx.activoFijo.update({ where: { id: dp.activoId }, data: { depreciado: { increment: aSoles(dp.monto) } } });
      if (plan.apertura) await this.aplicarApertura(tx, plan, asiento.id);
      return { asientoId: asiento.id, numero: asiento.numero, documentoId, ...(await this.vista(plan, tx)) };
    });
  }

  // ───────────────────────── Construcción de asientos ─────────────────────────

  private async construir(dto: OperacionDto, db: Tx | PrismaService): Promise<Plan> {
    const empresa = await this.empresaSvc.obtenerOError();
    const m = modulosDe(empresa);
    const notas: string[] = [];
    const base: Plan = { operacion: dto.tipo, fecha: dto.fecha, glosa: '', lineas: [], notas, kardex: [] };

    if (dto.tipo === 'PLANILLA' && !m.planilla) throw new ErrorCampo('tipo', 'Tu perfil no usa planilla (se puede activar en Configuración)');
    if ((dto.tipo === 'DEPRECIACION' || dto.tipo === 'COMPRA_ACTIVO' || dto.tipo === 'VENTA_ACTIVO') && !m.activos) throw new ErrorCampo('tipo', 'Tu perfil no usa activos fijos (se puede activar en Configuración)');
    if (dto.tipo === 'HONORARIOS' && !m.honorarios) throw new ErrorCampo('tipo', 'Tu perfil no recibe recibos por honorarios (se puede activar en Configuración)');
    if ((dto.tipo === 'COMPRA_MERCADERIA' || dto.tipo === 'VENTA_MERCADERIA') && !m.kardex) throw new ErrorCampo('tipo', 'Tu perfil presta servicios y no maneja mercadería');
    if (dto.moneda === 'USD' && !m.dolares) throw new ErrorCampo('moneda', 'Tu perfil no usa dólares (se puede activar en Configuración)');
    if (dto.tipo !== 'MANUAL' && dto.tipo !== 'APERTURA' && (await this.asientos.periodoCerrado(dto.fecha, db)) && !dto.motivoPeriodoCerrado) {
      throw new ErrorCampo('fecha', `El periodo ${dto.fecha.slice(0, 7)} está cerrado`);
    }

    switch (dto.tipo) {
      case 'COMPRA_MERCADERIA': return this.compra(dto, base, empresa, db);
      case 'COMPRA_ACTIVO': return this.compraDeActivo(dto, base, empresa, db);
      case 'PAGO_SERVICIO': return this.servicio(dto, base, empresa, db);
      case 'HONORARIOS': return this.recibo(dto, base, empresa, db);
      case 'VENTA_MERCADERIA':
      case 'VENTA_SERVICIO': return this.venta(dto, base, empresa, db);
      case 'VENTA_ACTIVO': return this.ventaDeActivo(dto, base, empresa, db);
      case 'COBRANZA':
      case 'PAGO_PROVEEDOR': return this.cancelacion(dto, base, db);
      case 'PLANILLA': return this.planillaMes(dto, base, db);
      case 'APORTE_CAPITAL': return this.capital(dto, base, db);
      case 'DEPRECIACION': return this.depreciacion(dto, base, db);
      case 'LIQUIDACION_IGV': return this.liquidacion(dto, base, db);
      case 'ESPECIAL': return this.especial(dto, base, empresa);
      case 'MANUAL': return this.manual(dto, base, db);
      case 'APERTURA': return this.apertura(dto, base, db);
    }
  }

  private async tercero(dto: OperacionDto, db: Tx | PrismaService, etiqueta: string) {
    if (!dto.terceroId) throw new ErrorCampo('terceroId', `Falta registrar ${etiqueta}`);
    const t = await db.tercero.findUnique({ where: { id: dto.terceroId } });
    if (!t) throw new ErrorCampo('terceroId', `Falta registrar ${etiqueta}`);
    return t;
  }

  /** Código de comprobante: tipo + serie + número + documento del tercero, sin repetirse. */
  private async comprobante(dto: OperacionDto, terceroId: number, db: Tx | PrismaService, nombreTercero: string, defectoTipo = '01') {
    const tipo = dto.tipoComprobante ?? defectoTipo;
    const serie = (dto.serie ?? '').trim().toUpperCase();
    const numero = (dto.numero ?? '').trim();
    if (!serie) throw new ErrorCampo('serie', 'Falta la serie del comprobante (ej. F001)');
    if (!/^[A-Z0-9]{1,4}$/.test(serie)) throw new ErrorCampo('serie', 'La serie debe tener hasta 4 letras o números (ej. F001)');
    if (!/^\d{1,8}$/.test(numero)) throw new ErrorCampo('numero', 'El número debe tener solo dígitos (ej. 000123)');
    const dup = await db.documento.findUnique({ where: { tipo_serie_numero_terceroId: { tipo, serie, numero, terceroId } } });
    if (dup) throw new ErrorCampo('numero', `Este número ya fue registrado el ${dup.fecha.toISOString().slice(8, 10)}/${dup.fecha.toISOString().slice(5, 7)}/${dup.fecha.toISOString().slice(0, 4)} para ${nombreTercero}`);
    return { tipo, serie, numero, texto: `${NOMBRE_COMPROBANTE[tipo] ?? 'comprobante'} ${serie}-${numero}` };
  }

  /** Moneda → soles, luego IGV según el modo elegido (o IGV manual validado). */
  private async montosDe(dto: OperacionDto, monto: number, tasa: number, db: Tx | PrismaService, notas: string[]) {
    const modo = dto.modoIgv ?? 'INCLUYE';
    if (!dto.modoIgv) notas.push('Por defecto: el monto incluye IGV, porque no indicaste otro modo.');
    let tc = 1;
    let soles = aCentimos(monto);
    if (dto.moneda === 'USD') {
      let t = dto.tipoCambio;
      if (!t) t = Number((await db.tipoCambio.findFirst({ where: { fecha: { lte: fechaDate(dto.fecha) } }, orderBy: { fecha: 'desc' } }))?.valor ?? 0);
      if (!t) throw new ErrorCampo('tipoCambio', 'Falta el tipo de cambio de la fecha del documento');
      tc = t;
      soles = convertirASoles(aCentimos(monto), tc);
      notas.push(`Convertido a soles con tipo de cambio ${tc} antes de calcular el IGV.`);
    }
    if (soles <= 0) throw new ErrorCampo('monto', 'Ingresa un monto mayor que cero');
    let montos = calcularMontos(modo, soles, tasa);
    if (dto.igvManual !== undefined && modo !== 'SIN') {
      const igv = aCentimos(dto.igvManual);
      montos = modo === 'MAS' ? { base: soles, igv, total: soles + igv } : { base: soles - igv, igv, total: soles };
      if (montos.base < 0 || montos.base + montos.igv !== montos.total) throw new ErrorCampo('igv', 'Base + IGV debe ser igual al Total');
      notas.push('IGV ingresado manualmente.');
    }
    return { montos, tc, moneda: dto.moneda ?? 'PEN' };
  }

  private condicion(dto: OperacionDto, defecto: Condicion, fecha: string, notas: string[]) {
    const c = dto.condicion ?? defecto;
    if (!dto.condicion) notas.push(defecto === 'CREDITO' ? 'Por defecto: a crédito, porque los activos se suelen pagar a plazo.' : 'Por defecto: pago al contado en efectivo, porque no indicaste otro medio.');
    if (c === 'CONTADO_BANCO' && !dto.cuentaBancaria?.trim()) throw new ErrorCampo('cuentaBancaria', 'Indica la cuenta bancaria');
    let vencimiento: string | undefined;
    if (c === 'CREDITO') {
      vencimiento = dto.vencimiento;
      if (!vencimiento) {
        const f = fechaDate(fecha);
        f.setUTCDate(f.getUTCDate() + 30);
        vencimiento = f.toISOString().slice(0, 10);
        notas.push('Por defecto: vence a los 30 días, porque no indicaste fecha de vencimiento.');
      }
    }
    return { condicion: c, vencimiento };
  }

  private docDe(dto: OperacionDto, sentido: 'COMPRA' | 'VENTA', cmp: { tipo: string; serie: string; numero: string }, terceroId: number, montos: Montos, tc: number, moneda: string, cond: { condicion: Condicion; vencimiento?: string }) {
    const contado = cond.condicion !== 'CREDITO';
    return {
      documento: { sentido, ...cmp, terceroId, moneda, tipoCambio: tc, base: montos.base, igv: montos.igv, total: montos.total, saldo: contado ? 0 : montos.total, condicion: cond.condicion, vencimiento: cond.vencimiento },
      pagoAuto: contado ? { monto: montos.total, medio: (cond.condicion === 'CONTADO_BANCO' ? 'BANCO' : 'EFECTIVO') as 'BANCO' | 'EFECTIVO', cuentaBancaria: dto.cuentaBancaria } : undefined,
    };
  }

  private async productos(ids: number[], db: Tx | PrismaService) {
    const ps = await db.producto.findMany({ where: { id: { in: ids } } });
    return new Map(ps.map((p) => [p.id, p]));
  }

  // ───────────── Compras ─────────────

  private async compra(dto: OperacionDto, p: Plan, empresa: any, db: Tx | PrismaService): Promise<Plan> {
    const t = await this.tercero(dto, db, 'el proveedor');
    const cmp = await this.comprobante(dto, t.id, db, t.nombre);
    const items = dto.items ?? [];
    const monto = items.length ? items.reduce((s, i) => s + i.monto, 0) : dto.monto ?? 0;
    if (!monto) throw new ErrorCampo(items.length ? 'items' : 'monto', 'Ingresa el monto de la compra');
    const { montos, tc, moneda } = await this.montosDe(dto, monto, empresa.igvTasa, db, p.notas);
    const cond = this.condicion(dto, 'CONTADO_EFECTIVO', dto.fecha, p.notas);
    const prods = await this.productos(items.map((i) => i.productoId), db);
    let materia = empresa.actividad === 'INDUSTRIAL';
    if (items.length) {
      for (const i of items) if (!prods.get(i.productoId)) throw new ErrorCampo('items', 'Falta registrar un producto');
      const tipos = new Set(items.map((i) => prods.get(i.productoId)!.tipo));
      if (tipos.size > 1) throw new ErrorCampo('items', 'No mezcles mercadería e insumos en una misma factura');
      materia = [...tipos][0] === 'MATERIA_PRIMA';
    }
    let ls = compraMercaderia({ montos, condicion: cond.condicion, cuenta: dto.cuenta, materiaPrima: materia, terceroId: t.id });
    if (!dto.cuenta) p.notas.push(`Por defecto: cuenta ${materia ? '6021' : '6011'}, la más usada para ${materia ? 'insumos' : 'mercadería'}.`);
    const kardex: MovKardex[] = [];
    if (items.length) {
      const partes = repartir(montos.base, items.map((i) => i.monto));
      items.forEach((i, k) => kardex.push({ productoId: i.productoId, tipo: 'ENTRADA', cantidad: i.cantidad, costoTotal: partes[k] }));
    } else p.notas.push('Compra por concepto: no actualiza el kárdex porque no indicaste productos.');
    return { ...p, lineas: ls, montos, kardex, glosa: `Por la compra según ${cmp.texto} de ${t.nombre}`, ...this.docDe(dto, 'COMPRA', cmp, t.id, montos, tc, moneda, cond) } as Plan;
  }

  private async compraDeActivo(dto: OperacionDto, p: Plan, empresa: any, db: Tx | PrismaService): Promise<Plan> {
    const t = await this.tercero(dto, db, 'el proveedor');
    const cmp = await this.comprobante(dto, t.id, db, t.nombre);
    const cuenta = dto.cuenta ?? '3351';
    if (!['332', '333', '3341', '3351', '336'].includes(cuenta)) throw new ErrorCampo('cuenta', 'Elige una cuenta de activo fijo (332, 333, 3341, 3351 o 336)');
    if (!dto.concepto?.trim()) throw new ErrorCampo('concepto', 'Indica qué bien compraste (ej. Camioneta Hilux)');
    const { montos, tc, moneda } = await this.montosDe(dto, dto.monto ?? 0, empresa.igvTasa, db, p.notas);
    const cond = this.condicion(dto, 'CREDITO', dto.fecha, p.notas);
    return {
      ...p, lineas: compraActivo({ montos, condicion: cond.condicion, cuenta, terceroId: t.id }), montos, glosa: `Por la compra de ${dto.concepto} según ${cmp.texto} de ${t.nombre}`,
      activoNuevo: { nombre: dto.concepto, cuenta, fechaCompra: dto.fecha, valor: montos.base, tasaAnual: TASA_DEPRECIACION_DEFECTO[cuenta] ?? 0.1 },
      ...this.docDe(dto, 'COMPRA', cmp, t.id, montos, tc, moneda, cond),
    };
  }

  private async servicio(dto: OperacionDto, p: Plan, empresa: any, db: Tx | PrismaService): Promise<Plan> {
    const t = await this.tercero(dto, db, 'el proveedor');
    const cmp = await this.comprobante(dto, t.id, db, t.nombre);
    const cuenta = dto.cuenta ?? '6391';
    if (!/^63/.test(cuenta)) throw new ErrorCampo('cuenta', 'Para servicios elige una cuenta 63xx');
    const area: Area = dto.area ?? (SERVICIOS_AREA_VENTAS.includes(cuenta) ? 'VENTAS' : 'ADMINISTRACION');
    if (!dto.area) p.notas.push(`Por defecto: ${area === 'VENTAS' ? 'Ventas (95)' : 'Administración (94)'}, porque no indicaste quién usa este gasto.`);
    const { montos, tc, moneda } = await this.montosDe(dto, dto.monto ?? 0, empresa.igvTasa, db, p.notas);
    const cond = this.condicion(dto, 'CONTADO_EFECTIVO', dto.fecha, p.notas);
    const cta = await db.cuenta.findUnique({ where: { codigo: cuenta } });
    return {
      ...p, lineas: pagoServicio({ montos, condicion: cond.condicion, cuenta, area, terceroId: t.id }), montos, glosa: `Por el servicio de ${(dto.concepto ?? cta?.nombre ?? 'terceros').toLowerCase()} según ${cmp.texto} de ${t.nombre}`,
      ...this.docDe(dto, 'COMPRA', cmp, t.id, montos, tc, moneda, cond),
    };
  }

  private async recibo(dto: OperacionDto, p: Plan, empresa: any, db: Tx | PrismaService): Promise<Plan> {
    const t = await this.tercero(dto, db, 'a la persona');
    if (t.tipoDoc === 'RUC' && t.documento.startsWith('20')) throw new ErrorCampo('terceroId', 'Un recibo por honorarios lo emite una persona natural, no una empresa');
    const cmp = await this.comprobante({ ...dto, tipoComprobante: 'RH' }, t.id, db, t.nombre, 'RH');
    const bruto = aCentimos(dto.monto ?? 0);
    if (bruto <= 0) throw new ErrorCampo('monto', 'Ingresa el monto bruto');
    const ret = retencionHonorarios(bruto, empresa.retencionTasa);
    p.notas.push(ret ? `Retención de ${(empresa.retencionTasa * 100).toFixed(0)} % aplicada porque el monto pasa de S/ 1,500.` : 'Sin retención: el monto no pasa de S/ 1,500.');
    const area: Area = dto.area ?? 'ADMINISTRACION';
    const pagado = dto.pagado ?? false;
    const cond: Condicion = pagado ? (dto.medio === 'BANCO' ? 'CONTADO_BANCO' : 'CONTADO_EFECTIVO') : 'CREDITO';
    const neto = bruto - ret;
    return {
      ...p, lineas: honorarios({ bruto, retencion: ret, cuenta: dto.cuenta, area, pagado, condicion: cond, terceroId: t.id }), montos: { base: bruto, igv: 0, total: bruto }, glosa: `Por los honorarios según ${cmp.texto} de ${t.nombre}`,
      documento: { sentido: 'COMPRA', tipo: 'RH', serie: cmp.serie, numero: cmp.numero, terceroId: t.id, moneda: 'PEN', tipoCambio: 1, base: bruto, igv: 0, total: bruto, saldo: pagado ? 0 : neto, condicion: cond, vencimiento: undefined },
      pagoAuto: pagado ? { monto: neto, medio: dto.medio === 'BANCO' ? 'BANCO' : 'EFECTIVO' } : undefined,
    };
  }

  // ───────────── Ventas ─────────────

  private async venta(dto: OperacionDto, p: Plan, empresa: any, db: Tx | PrismaService): Promise<Plan> {
    const t = await this.tercero(dto, db, 'el cliente');
    const cmp = await this.comprobante(dto, t.id, db, t.nombre);
    const items = dto.items ?? [];
    const esServicio = dto.tipo === 'VENTA_SERVICIO';
    const monto = items.length ? items.reduce((s, i) => s + i.monto, 0) : dto.monto ?? 0;
    if (!esServicio && empresa.actividad !== 'SERVICIOS' && !items.length && !dto.cuenta) p.notas.push('Venta por concepto: no descuenta stock del kárdex porque no indicaste productos.');
    if (!monto) throw new ErrorCampo(items.length ? 'items' : 'monto', 'Ingresa el precio de la venta');
    const { montos, tc, moneda } = await this.montosDe(dto, monto, empresa.igvTasa, db, p.notas);
    const cond = this.condicion(dto, 'CONTADO_EFECTIVO', dto.fecha, p.notas);
    const kardex: MovKardex[] = [];
    const costos = new Map<string, { cuentaCosto: string; cuentaAlmacen: string; monto: number }>();
    const ingresos = new Map<string, number>();
    let ingresoDefecto = dto.cuenta ?? (esServicio ? C.VENTA_SERVICIO : empresa.actividad === 'INDUSTRIAL' ? C.VENTA_PRODUCTO : empresa.actividad === 'SERVICIOS' ? C.VENTA_SERVICIO : C.VENTA_MERCADERIA);
    if (!dto.cuenta) p.notas.push(`Por defecto: ingreso en la cuenta ${ingresoDefecto}, según el tipo de actividad.`);
    if (items.length) {
      const prods = await this.productos(items.map((i) => i.productoId), db);
      const saldos = new Map<number, SaldoKardex>();
      const partes = repartir(montos.base, items.map((i) => i.monto));
      for (const [k, i] of items.entries()) {
        const pr = prods.get(i.productoId);
        if (!pr) throw new ErrorCampo('items', 'Falta registrar un producto');
        const s = saldos.get(pr.id) ?? { cantidad: Number(pr.stock), costo: aCentimos(pr.valorTotal.toString()) };
        if (i.cantidad > s.cantidad) throw new ErrorCampo('items', `No hay stock suficiente de ${pr.nombre}: hay ${s.cantidad} y pides ${i.cantidad}`);
        const r = salidaKardex(s, i.cantidad);
        saldos.set(pr.id, r.saldo);
        kardex.push({ productoId: pr.id, tipo: 'SALIDA', cantidad: i.cantidad, costoTotal: r.costoSalida });
        const terminado = pr.tipo === 'PRODUCTO_TERMINADO';
        const ing = dto.cuenta ?? (terminado ? C.VENTA_PRODUCTO : C.VENTA_MERCADERIA);
        ingresos.set(ing, (ingresos.get(ing) ?? 0) + partes[k]);
        const ck = terminado ? C.COSTO_VENTA_PRODUCTO : C.COSTO_VENTA_MERCADERIA;
        const prev = costos.get(ck);
        costos.set(ck, { cuentaCosto: ck, cuentaAlmacen: terminado ? C.PRODUCTOS_TERMINADOS : C.MERCADERIAS, monto: (prev?.monto ?? 0) + r.costoSalida });
      }
    } else ingresos.set(ingresoDefecto, montos.base);
    return {
      ...p, lineas: ventaMercaderia({ montos, condicion: cond.condicion, ingresos: [...ingresos].map(([cuenta, base]) => ({ cuenta, base })), costos: [...costos.values()], terceroId: t.id }), montos,
      kardex, glosa: `Por la venta según ${cmp.texto} a ${t.nombre}`, ...this.docDe(dto, 'VENTA', cmp, t.id, montos, tc, moneda, cond),
    };
  }

  private async ventaDeActivo(dto: OperacionDto, p: Plan, empresa: any, db: Tx | PrismaService): Promise<Plan> {
    const t = await this.tercero(dto, db, 'el comprador');
    const cmp = await this.comprobante(dto, t.id, db, t.nombre);
    const activo = dto.activoId ? await db.activoFijo.findUnique({ where: { id: dto.activoId } }) : null;
    if (!activo || activo.estado !== 'ACTIVO') throw new ErrorCampo('activoId', 'Elige un bien activo para vender');
    const { montos, tc, moneda } = await this.montosDe(dto, dto.monto ?? 0, empresa.igvTasa, db, p.notas);
    const cond = this.condicion(dto, 'CONTADO_EFECTIVO', dto.fecha, p.notas);
    const costo = aCentimos(activo.valor.toString());
    const dep = aCentimos(activo.depreciado.toString());
    p.notas.push(`Valor en libros del bien: S/ ${aSoles(costo - dep).toFixed(2)} (costo ${aSoles(costo).toFixed(2)} menos depreciación ${aSoles(dep).toFixed(2)}).`);
    return {
      ...p, lineas: ventaActivo({ montos, condicion: cond.condicion, cuentaActivo: activo.cuenta, costoHistorico: costo, depreciacionAcumulada: dep, terceroId: t.id }), montos,
      glosa: `Por la venta de ${activo.nombre} según ${cmp.texto} a ${t.nombre}`, activoVendido: activo.id, ...this.docDe(dto, 'VENTA', cmp, t.id, montos, tc, moneda, cond),
    };
  }

  // ───────────── Cobranza y pagos ─────────────

  private async cancelacion(dto: OperacionDto, p: Plan, db: Tx | PrismaService): Promise<Plan> {
    const cobro = dto.tipo === 'COBRANZA';
    const t = await this.tercero(dto, db, cobro ? 'el cliente' : 'el proveedor');
    if (!dto.documentoId) throw new ErrorCampo('documentoId', `Elige la factura pendiente que ${cobro ? 'te pagaron' : 'vas a pagar'}`);
    await db.$executeRaw`SELECT id FROM "Documento" WHERE id = ${dto.documentoId} FOR UPDATE`;
    const doc = await db.documento.findUnique({ where: { id: dto.documentoId } });
    if (!doc || doc.anulado || doc.terceroId !== t.id || doc.sentido !== (cobro ? 'VENTA' : 'COMPRA')) throw new ErrorCampo('documentoId', 'Falta registrar la factura');
    const monto = aCentimos(dto.monto ?? 0);
    const saldo = aCentimos(doc.saldo.toString());
    if (monto <= 0) throw new ErrorCampo('monto', 'Ingresa el monto');
    if (monto > saldo) throw new ErrorCampo('monto', `Solo quedan S/ ${aSoles(saldo).toFixed(2)} pendientes en este documento`);
    const medio = dto.medio ?? 'EFECTIVO';
    if (!dto.medio) p.notas.push('Por defecto: efectivo, porque no indicaste otro medio.');
    if (medio === 'BANCO' && !dto.cuentaBancaria?.trim()) throw new ErrorCampo('cuentaBancaria', 'Indica la cuenta bancaria');
    const ref = `${NOMBRE_COMPROBANTE[doc.tipo] ?? 'comprobante'} ${doc.serie}-${doc.numero}`;
    const ls = cobro ? cobranza(monto, medio, t.id) : pagoProveedor(monto, medio, t.id, doc.tipo === 'RH' ? C.HONORARIOS_POR_PAGAR : C.FACTURAS_POR_PAGAR);
    return { ...p, lineas: ls, glosa: cobro ? `Por la cobranza de ${ref} de ${t.nombre}` : `Por el pago de ${ref} a ${t.nombre}`, cobroPago: { documentoId: doc.id, monto, medio, cuentaBancaria: dto.cuentaBancaria } };
  }

  // ───────────── Planilla, capital, activos, IGV ─────────────

  private async planillaMes(dto: OperacionDto, p: Plan, db: Tx | PrismaService): Promise<Plan> {
    const periodo = dto.fecha.slice(0, 7);
    if (await db.asiento.findFirst({ where: { operacion: 'PLANILLA', periodo, estado: 'ACTIVO' } })) throw new ErrorCampo('fecha', `Ya registraste la planilla de ${periodo}`);
    const ids = (dto.trabajadores ?? []).map((t) => t.terceroId);
    if (!ids.length) throw new ErrorCampo('trabajadores', 'Agrega al menos un trabajador');
    const ts = await db.tercero.findMany({ where: { id: { in: ids }, tipo: 'TRABAJADOR' } });
    const filas = (dto.trabajadores ?? []).map((w) => {
      const t = ts.find((x) => x.id === w.terceroId);
      if (!t) throw new ErrorCampo('trabajadores', 'Falta registrar un trabajador');
      const sueldo = w.sueldo ?? Number(t.sueldo ?? 0);
      if (sueldo <= 0) throw new ErrorCampo('trabajadores', `Falta el sueldo de ${t.nombre}`);
      return { sueldo: aCentimos(sueldo), pension: (w.pension ?? t.pension ?? 'ONP') as 'ONP' | 'AFP', terceroId: t.id };
    });
    p.notas.push('Aportes por defecto: ESSALUD 9 % (empleador) y ONP 13 % o AFP según cada trabajador.');
    const area: Area = dto.area ?? 'ADMINISTRACION';
    const r = resumenPlanilla(filas);
    p.notas.push(`Total bruto S/ ${aSoles(r.bruto).toFixed(2)}, descuentos S/ ${aSoles(r.onp + r.afp).toFixed(2)}, neto a pagar S/ ${aSoles(r.neto).toFixed(2)}.`);
    return { ...p, lineas: planilla(filas, area), glosa: `Por la planilla de remuneraciones de ${periodo}` };
  }

  private async capital(dto: OperacionDto, p: Plan, db: Tx | PrismaService): Promise<Plan> {
    const t = await this.tercero(dto, db, 'el socio');
    const tipo = dto.tipoAporte ?? 'DINERO';
    const monto = aCentimos(dto.monto ?? 0);
    if (monto <= 0) throw new ErrorCampo('monto', 'Ingresa el monto del aporte');
    const medio = dto.medio ?? 'BANCO';
    if (!dto.medio && (tipo === 'DINERO' || tipo === 'PAGO_SUSCRIPCION')) p.notas.push('Por defecto: el aporte entra por banco, porque no indicaste otro medio.');
    if (tipo === 'BIEN' && !dto.cuenta) throw new ErrorCampo('cuenta', 'Elige la cuenta del bien aportado');
    const aumento = dto.aumento ?? false;
    p.notas.push(aumento ? 'Aumento de capital: va a 5221 (aportes en trámite) hasta formalizarlo.' : 'Aporte inicial: va a 501 (capital social).');
    const etiqueta = { DINERO: 'aporte en dinero', BIEN: 'aporte en bienes', SUSCRIPCION: 'suscripción de acciones', PAGO_SUSCRIPCION: 'pago de suscripción' }[tipo];
    return { ...p, lineas: aporteCapital({ tipo, monto, medio, aumento, cuentaBien: dto.cuenta, terceroId: t.id }), glosa: `Por el ${etiqueta} de ${t.nombre}` };
  }

  private async depreciacion(dto: OperacionDto, p: Plan, db: Tx | PrismaService): Promise<Plan> {
    const periodo = dto.fecha.slice(0, 7);
    if (await db.asiento.findFirst({ where: { operacion: 'DEPRECIACION', periodo, estado: 'ACTIVO' } })) throw new ErrorCampo('fecha', `Ya registraste la depreciación de ${periodo}`);
    const primerDia = fechaDate(`${periodo}-01`);
    const activos = await db.activoFijo.findMany({ where: { estado: 'ACTIVO', fechaCompra: { lt: primerDia } } });
    const base = activos.map((a) => ({ id: a.id, cuenta: a.cuenta, valor: aCentimos(a.valor.toString()), depreciado: aCentimos(a.depreciado.toString()), tasaAnual: Number(a.tasaAnual) }));
    const ls = depreciacionMes(base, dto.area ?? 'ADMINISTRACION');
    if (!ls.length) throw new ErrorCampo('fecha', 'No hay activos con depreciación pendiente en ese mes');
    p.notas.push(`Se calculó la depreciación de ${base.filter((a) => cuotaDepreciacion(a) > 0).length} activo(s) en línea recta.`);
    return { ...p, lineas: ls, glosa: `Por la depreciación de ${periodo}`, depreciaciones: base.map((a) => ({ activoId: a.id, monto: cuotaDepreciacion(a) })).filter((x) => x.monto > 0) };
  }

  private async liquidacion(dto: OperacionDto, p: Plan, db: Tx | PrismaService): Promise<Plan> {
    const periodo = dto.fecha.slice(0, 7);
    if (await db.asiento.findFirst({ where: { operacion: 'LIQUIDACION_IGV', periodo, estado: 'ACTIVO' } })) throw new ErrorCampo('fecha', `Ya liquidaste el IGV de ${periodo}`);
    // Incluye asientos anulados y sus reversiones: se compensan entre sí.
    const mov = await db.asientoLinea.aggregate({
      where: { cuentaCodigo: C.IGV, asiento: { periodo, operacion: { not: 'LIQUIDACION_IGV' } } },
      _sum: { debe: true, haber: true },
    });
    const ventas = aCentimos((mov._sum.haber ?? 0).toString());
    const compras = aCentimos((mov._sum.debe ?? 0).toString());
    const ls = liquidacionIgv(ventas, compras);
    if (!ls.length) throw new ErrorCampo('fecha', 'No hay movimientos de IGV en ese mes');
    p.notas.push(ventas >= compras ? `IGV a pagar a SUNAT: S/ ${aSoles(ventas - compras).toFixed(2)}.` : `Saldo a favor del contribuyente: S/ ${aSoles(compras - ventas).toFixed(2)}.`);
    return { ...p, lineas: ls, glosa: `Por la liquidación del IGV de ${periodo}` };
  }

  private async especial(dto: OperacionDto, p: Plan, empresa: any): Promise<Plan> {
    const monto = aCentimos(dto.monto ?? 0);
    if (monto <= 0) throw new ErrorCampo('monto', 'Ingresa el monto');
    const montos = calcularMontos(dto.modoIgv ?? 'INCLUYE', monto, empresa.igvTasa);
    const medio = dto.medio ?? 'BANCO';
    const tid = dto.terceroId;
    const f: Record<string, [string, () => Linea[]]> = {
      NOTA_CREDITO: ['Por la nota de crédito emitida (devolución)', () => PLANTILLAS.notaCreditoEmitida(montos, tid)],
      REBAJA: ['Por la rebaja concedida', () => PLANTILLAS.rebajaConcedida(montos, tid)],
      DEVOLUCION_COMPRA: ['Por la devolución de compra', () => PLANTILLAS.devolucionCompra(montos, tid)],
      ANTICIPO_CLIENTE: ['Por el anticipo recibido de cliente', () => PLANTILLAS.anticipoCliente(montos, medio, tid)],
      ANTICIPO_PROVEEDOR: ['Por el anticipo otorgado a proveedor', () => PLANTILLAS.anticipoProveedor(monto, medio, tid)],
      PRESTAMO: ['Por el préstamo recibido', () => PLANTILLAS.prestamoRecibido(monto)],
      CUOTA_PRESTAMO: ['Por el pago de cuota de préstamo', () => PLANTILLAS.pagoCuotaPrestamo(monto, aCentimos(dto.interes ?? 0))],
      DIVIDENDOS: ['Por los dividendos acordados', () => PLANTILLAS.dividendos(monto, tid)],
      PAGO_DIVIDENDOS: ['Por el pago de dividendos', () => PLANTILLAS.pagoDividendos(monto, tid)],
    };
    const def = f[dto.plantilla ?? ''];
    if (!def) throw new ErrorCampo('plantilla', 'Elige una plantilla válida');
    return { ...p, lineas: def[1](), montos, glosa: dto.glosa ?? def[0] };
  }

  private async manual(dto: OperacionDto, p: Plan, db: Tx | PrismaService): Promise<Plan> {
    const ls: Linea[] = (dto.lineas ?? []).map((l) => ({ cuenta: l.cuenta, debe: aCentimos(l.debe ?? 0), haber: aCentimos(l.haber ?? 0), etapa: 'OTRO', terceroId: l.terceroId }));
    if (ls.length < 2) throw new ErrorCampo('lineas', 'Agrega al menos dos líneas');
    if (!dto.glosa?.trim()) throw new ErrorCampo('glosa', 'Escribe una glosa que explique el asiento');
    return { ...p, lineas: ls, glosa: dto.glosa };
  }

  // ───────────── Apertura ─────────────

  private async apertura(dto: OperacionDto, p: Plan, db: Tx | PrismaService): Promise<Plan> {
    const anio = dto.fecha.slice(0, 4);
    if (await db.asiento.findFirst({ where: { operacion: 'APERTURA', periodo: { startsWith: anio }, estado: 'ACTIVO' } })) throw new ErrorCampo('fecha', `Ya existe un asiento de apertura para ${anio}`);
    const ls: Linea[] = (dto.lineas ?? []).map((l) => ({ cuenta: l.cuenta, debe: aCentimos(l.debe ?? 0), haber: aCentimos(l.haber ?? 0), etapa: 'OTRO', terceroId: l.terceroId }));
    if (ls.length < 2) throw new ErrorCampo('lineas', 'Ingresa los saldos iniciales');
    const saldo = (cta: string) => ls.filter((l) => l.cuenta === cta || (cta === '33' && /^33/.test(l.cuenta))).reduce((s, l) => s + l.debe - l.haber, 0);
    const pend = dto.pendientes ?? [];
    const sumPend = (s: 'VENTA' | 'COMPRA') => pend.filter((x) => x.sentido === s).reduce((a, x) => a + aCentimos(x.total), 0);
    if (sumPend('VENTA') !== saldo(C.FACTURAS_POR_COBRAR)) throw new ErrorCampo('pendientes', `Las facturas por cobrar (S/ ${aSoles(sumPend('VENTA')).toFixed(2)}) deben sumar el saldo de la cuenta 1212 (S/ ${aSoles(saldo(C.FACTURAS_POR_COBRAR)).toFixed(2)})`);
    if (sumPend('COMPRA') !== -saldo(C.FACTURAS_POR_PAGAR)) throw new ErrorCampo('pendientes', `Las facturas por pagar (S/ ${aSoles(sumPend('COMPRA')).toFixed(2)}) deben sumar el saldo de la cuenta 4212 (S/ ${aSoles(-saldo(C.FACTURAS_POR_PAGAR)).toFixed(2)})`);
    const ex = dto.existencias ?? [];
    const sumEx = ex.reduce((a, x) => a + aCentimos(x.costoTotal), 0);
    const exCuentas = saldo(C.MERCADERIAS) + saldo(C.PRODUCTOS_TERMINADOS) + saldo(C.MATERIAS_PRIMAS);
    if (sumEx !== exCuentas) throw new ErrorCampo('existencias', `El detalle de productos (S/ ${aSoles(sumEx).toFixed(2)}) debe sumar las cuentas de existencias (S/ ${aSoles(exCuentas).toFixed(2)})`);
    const act = dto.activos ?? [];
    const sumAct = act.reduce((a, x) => a + aCentimos(x.valor), 0);
    if (sumAct !== saldo('33')) throw new ErrorCampo('activos', `El detalle de activos (S/ ${aSoles(sumAct).toFixed(2)}) debe sumar las cuentas 33 (S/ ${aSoles(saldo('33')).toFixed(2)})`);
    return { ...p, lineas: ls, glosa: dto.glosa ?? `Asiento de apertura al ${dto.fecha}`, apertura: { pendientes: pend, existencias: ex, activos: act } };
  }

  private async aplicarApertura(tx: Tx, plan: Plan, asientoId: number) {
    const a = plan.apertura!;
    for (const x of a.pendientes) {
      await tx.documento.create({
        data: { sentido: x.sentido, tipo: x.tipo, serie: x.serie, numero: x.numero, terceroId: x.terceroId, fecha: fechaDate(x.fecha), base: aSoles(aCentimos(x.total)), igv: 0, total: x.total, saldo: x.total, condicion: 'CREDITO', operacion: 'APERTURA', glosa: 'Saldo de apertura', asientoId },
      });
    }
    for (const e of a.existencias) await this.aplicarKardex(tx, { productoId: e.productoId, tipo: 'ENTRADA', cantidad: e.cantidad, costoTotal: aCentimos(e.costoTotal) }, plan.fecha, asientoId);
    for (const x of a.activos) {
      await tx.activoFijo.create({ data: { nombre: x.nombre, cuenta: x.cuenta, fechaCompra: fechaDate(x.fechaCompra), valor: x.valor, depreciado: x.depreciado, tasaAnual: x.tasaAnual ?? TASA_DEPRECIACION_DEFECTO[x.cuenta] ?? 0.1, vidaUtilMeses: Math.round(12 / (x.tasaAnual ?? TASA_DEPRECIACION_DEFECTO[x.cuenta] ?? 0.1)) } });
    }
  }

  // ───────────── Kárdex ─────────────

  private async aplicarKardex(tx: Tx, m: MovKardex, fecha: string, asientoId: number) {
    await tx.$executeRaw`SELECT id FROM "Producto" WHERE id = ${m.productoId} FOR UPDATE`;
    const p = await tx.producto.findUniqueOrThrow({ where: { id: m.productoId } });
    const s: SaldoKardex = { cantidad: Number(p.stock), costo: aCentimos(p.valorTotal.toString()) };
    let nuevo: SaldoKardex;
    if (m.tipo === 'ENTRADA') nuevo = entradaKardex(s, m.cantidad, m.costoTotal);
    else {
      if (m.cantidad > s.cantidad) throw new ErrorCampo('items', `No hay stock suficiente de ${p.nombre}: hay ${s.cantidad} y pides ${m.cantidad}`);
      nuevo = salidaKardex(s, m.cantidad).saldo;
    }
    const unit = nuevo.cantidad > 0 ? costoUnitario4(nuevo) / 10000 : 0;
    await tx.producto.update({ where: { id: p.id }, data: { stock: nuevo.cantidad, valorTotal: aSoles(nuevo.costo), costoPromedio: nuevo.cantidad > 0 ? aSoles(nuevo.costo) / nuevo.cantidad : 0 } });
    await tx.kardexMov.create({
      data: {
        productoId: p.id, fecha: fechaDate(fecha), tipo: m.tipo, cantidad: m.cantidad, costoUnit: m.cantidad ? aSoles(m.costoTotal) / m.cantidad : unit, costoTotal: aSoles(m.costoTotal),
        saldoCant: nuevo.cantidad, saldoCosto: aSoles(nuevo.costo), asientoId,
      },
    });
  }

  // ───────────── Vista previa ─────────────

  private async vista(plan: Plan, db: Tx | PrismaService) {
    const cuentas = await db.cuenta.findMany({ where: { codigo: { in: [...new Set(plan.lineas.map((l) => l.cuenta))] } } });
    const nombre = new Map(cuentas.map((c) => [c.codigo, c.nombre]));
    for (const l of plan.lineas) if (!nombre.has(l.cuenta)) throw new ErrorCampo('lineas', `Esta cuenta no existe: ${l.cuenta}`);
    const t = totales(plan.lineas);
    return {
      operacion: plan.operacion, fecha: plan.fecha, glosa: plan.glosa, notas: plan.notas,
      montos: plan.montos ? { base: aSoles(plan.montos.base), igv: aSoles(plan.montos.igv), total: aSoles(plan.montos.total) } : undefined,
      lineas: plan.lineas.map((l, i) => ({ n: i + 1, etapa: l.etapa, cuenta: l.cuenta, nombre: nombre.get(l.cuenta), debe: aSoles(l.debe), haber: aSoles(l.haber) })),
      totales: { debe: aSoles(t.debe), haber: aSoles(t.haber), cuadra: t.cuadra },
      documento: plan.documento ? { ...plan.documento, base: aSoles(plan.documento.base), igv: aSoles(plan.documento.igv), total: aSoles(plan.documento.total), saldo: aSoles(plan.documento.saldo) } : undefined,
    };
  }
}
