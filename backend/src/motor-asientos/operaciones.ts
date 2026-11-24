import { Area, Condicion, Linea, Montos } from './tipos';
import { AREA_CUENTA, C, DEPRECIACION_ACUMULADA } from './cuentas';
import { cuentaMedio, cuentaMedioPago, d, esContado, h } from './montos';

// Cada función es pura: recibe importes en céntimos y devuelve las líneas del asiento
// en el formato de tres partes: provisión, destino y cancelación.

const sinCeros = (ls: Linea[]) => ls.filter((l) => l.debe !== 0 || l.haber !== 0);

export interface CompraInput {
  montos: Montos;
  condicion: Condicion;
  cuenta?: string;
  terceroId?: number;
}

export function compraMercaderia(i: CompraInput & { materiaPrima?: boolean }): Linea[] {
  const { base, igv, total } = i.montos;
  const cuenta = i.cuenta ?? (i.materiaPrima ? C.COMPRA_MATERIA_PRIMA : C.COMPRA_MERCADERIA);
  const almacen = i.materiaPrima ? C.MATERIAS_PRIMAS : C.MERCADERIAS;
  const variacion = i.materiaPrima ? C.VARIACION_MATERIAS_PRIMAS : C.VARIACION_MERCADERIAS;
  const ls: Linea[] = [
    d(cuenta, base, 'PROVISION'), d(C.IGV, igv, 'PROVISION'), h(C.FACTURAS_POR_PAGAR, total, 'PROVISION', i.terceroId),
    d(almacen, base, 'DESTINO'), h(variacion, base, 'DESTINO'),
  ];
  if (esContado(i.condicion)) ls.push(d(C.FACTURAS_POR_PAGAR, total, 'CANCELACION', i.terceroId), h(cuentaMedio(i.condicion), total, 'CANCELACION'));
  return sinCeros(ls);
}

export function compraActivo(i: CompraInput & { cuenta: string }): Linea[] {
  const { base, igv, total } = i.montos;
  const ls: Linea[] = [d(i.cuenta, base, 'PROVISION'), d(C.IGV, igv, 'PROVISION'), h(C.FACTURAS_POR_PAGAR, total, 'PROVISION', i.terceroId)];
  if (esContado(i.condicion)) ls.push(d(C.FACTURAS_POR_PAGAR, total, 'CANCELACION', i.terceroId), h(cuentaMedio(i.condicion), total, 'CANCELACION'));
  return sinCeros(ls);
}

export function pagoServicio(i: CompraInput & { cuenta: string; area: Area }): Linea[] {
  const { base, igv, total } = i.montos;
  const ls: Linea[] = [
    d(i.cuenta, base, 'PROVISION'), d(C.IGV, igv, 'PROVISION'), h(C.FACTURAS_POR_PAGAR, total, 'PROVISION', i.terceroId),
    d(AREA_CUENTA[i.area], base, 'DESTINO'), h(C.DEST_CONTRAPARTIDA, base, 'DESTINO'),
  ];
  if (esContado(i.condicion)) ls.push(d(C.FACTURAS_POR_PAGAR, total, 'CANCELACION', i.terceroId), h(cuentaMedio(i.condicion), total, 'CANCELACION'));
  return sinCeros(ls);
}

/** Retención de 4.ª categoría: solo si el bruto supera S/ 1,500. */
export function retencionHonorarios(bruto: number, tasa = 0.08, umbral = 150000): number {
  return bruto > umbral ? Math.round(bruto * tasa) : 0;
}

export function honorarios(i: { bruto: number; retencion: number; cuenta?: string; area: Area; pagado: boolean; condicion?: Condicion; terceroId?: number }): Linea[] {
  const neto = i.bruto - i.retencion;
  const ls: Linea[] = [
    d(i.cuenta ?? C.HONORARIOS_GASTO, i.bruto, 'PROVISION'),
    h(C.RETENCION_4TA, i.retencion, 'PROVISION'),
    h(C.HONORARIOS_POR_PAGAR, neto, 'PROVISION', i.terceroId),
    d(AREA_CUENTA[i.area], i.bruto, 'DESTINO'), h(C.DEST_CONTRAPARTIDA, i.bruto, 'DESTINO'),
  ];
  if (i.pagado) ls.push(d(C.HONORARIOS_POR_PAGAR, neto, 'CANCELACION', i.terceroId), h(cuentaMedio(i.condicion ?? 'CONTADO_EFECTIVO'), neto, 'CANCELACION'));
  return sinCeros(ls);
}

export interface VentaInput {
  montos: Montos;
  condicion: Condicion;
  cuentaIngreso?: string;
  /** Reparto de la base por cuenta de ingreso (mercaderías 7012, productos 702, etc.). */
  ingresos?: { cuenta: string; base: number }[];
  costo?: number; // del kárdex
  cuentaCosto?: string;
  cuentaAlmacen?: string;
  /** Costos por tipo de existencia cuando la venta mezcla mercaderías y productos terminados. */
  costos?: { cuentaCosto: string; cuentaAlmacen: string; monto: number }[];
  terceroId?: number;
}

export function ventaMercaderia(i: VentaInput): Linea[] {
  const { base, igv, total } = i.montos;
  const ingresos = i.ingresos ?? [{ cuenta: i.cuentaIngreso ?? C.VENTA_MERCADERIA, base }];
  const costos = i.costos ?? (i.costo ? [{ cuentaCosto: i.cuentaCosto ?? C.COSTO_VENTA_MERCADERIA, cuentaAlmacen: i.cuentaAlmacen ?? C.MERCADERIAS, monto: i.costo }] : []);
  const ls: Linea[] = [d(C.FACTURAS_POR_COBRAR, total, 'PROVISION', i.terceroId), h(C.IGV, igv, 'PROVISION'), ...ingresos.map((x) => h(x.cuenta, x.base, 'PROVISION'))];
  for (const c of costos) ls.push(d(c.cuentaCosto, c.monto, 'COSTO'), h(c.cuentaAlmacen, c.monto, 'COSTO'));
  if (esContado(i.condicion)) ls.push(d(cuentaMedio(i.condicion), total, 'CANCELACION'), h(C.FACTURAS_POR_COBRAR, total, 'CANCELACION', i.terceroId));
  return sinCeros(ls);
}

export function ventaActivo(i: { montos: Montos; condicion: Condicion; cuentaActivo: string; costoHistorico: number; depreciacionAcumulada: number; terceroId?: number }): Linea[] {
  const { base, igv, total } = i.montos;
  const valorLibros = i.costoHistorico - i.depreciacionAcumulada;
  const ls: Linea[] = [
    d(C.FACTURAS_POR_COBRAR, total, 'PROVISION', i.terceroId), h(C.IGV, igv, 'PROVISION'), h(C.VENTA_ACTIVOS, base, 'PROVISION'),
    d(DEPRECIACION_ACUMULADA[i.cuentaActivo] ?? '3913', i.depreciacionAcumulada, 'BAJA'),
    d(C.COSTO_NETO_ACTIVOS, valorLibros, 'BAJA'),
    h(i.cuentaActivo, i.costoHistorico, 'BAJA'),
  ];
  if (esContado(i.condicion)) ls.push(d(cuentaMedio(i.condicion), total, 'CANCELACION'), h(C.FACTURAS_POR_COBRAR, total, 'CANCELACION', i.terceroId));
  return sinCeros(ls);
}

export const cobranza = (monto: number, medio: 'EFECTIVO' | 'BANCO', terceroId?: number): Linea[] => [
  d(cuentaMedioPago(medio), monto, 'CANCELACION'), h(C.FACTURAS_POR_COBRAR, monto, 'CANCELACION', terceroId),
];

export const pagoProveedor = (monto: number, medio: 'EFECTIVO' | 'BANCO', terceroId?: number, cuentaPorPagar: string = C.FACTURAS_POR_PAGAR): Linea[] => [
  d(cuentaPorPagar, monto, 'CANCELACION', terceroId), h(cuentaMedioPago(medio), monto, 'CANCELACION'),
];

export interface TrabajadorPlanilla {
  sueldo: number;
  pension: 'ONP' | 'AFP';
  terceroId?: number;
}

export interface ResumenPlanilla {
  bruto: number; essalud: number; onp: number; afp: number; neto: number;
}

export function resumenPlanilla(ts: TrabajadorPlanilla[], tasaEssalud = 0.09, tasaOnp = 0.13, tasaAfp = 0.13): ResumenPlanilla {
  let bruto = 0, essalud = 0, onp = 0, afp = 0;
  for (const t of ts) {
    bruto += t.sueldo;
    essalud += Math.round(t.sueldo * tasaEssalud);
    if (t.pension === 'ONP') onp += Math.round(t.sueldo * tasaOnp);
    else afp += Math.round(t.sueldo * tasaAfp);
  }
  return { bruto, essalud, onp, afp, neto: bruto - onp - afp };
}

export function planilla(ts: TrabajadorPlanilla[], area: Area): Linea[] {
  const r = resumenPlanilla(ts);
  const gasto = r.bruto + r.essalud;
  return sinCeros([
    d(C.SUELDOS, r.bruto, 'PROVISION'), d(C.ESSALUD_GASTO, r.essalud, 'PROVISION'),
    h(C.ESSALUD, r.essalud, 'PROVISION'), h(C.ONP, r.onp, 'PROVISION'), h(C.AFP, r.afp, 'PROVISION'), h(C.REMUNERACIONES_POR_PAGAR, r.neto, 'PROVISION'),
    d(AREA_CUENTA[area], gasto, 'DESTINO'), h(C.DEST_CONTRAPARTIDA, gasto, 'DESTINO'),
  ]);
}

export type TipoAporte = 'DINERO' | 'BIEN' | 'SUSCRIPCION' | 'PAGO_SUSCRIPCION';

export function aporteCapital(i: { tipo: TipoAporte; monto: number; medio?: 'EFECTIVO' | 'BANCO'; aumento?: boolean; cuentaBien?: string; terceroId?: number }): Linea[] {
  const haber = i.aumento ? C.APORTES_EN_TRAMITE : C.CAPITAL;
  switch (i.tipo) {
    case 'BIEN': return [d(i.cuentaBien ?? C.MERCADERIAS, i.monto, 'OTRO'), h(haber, i.monto, 'OTRO', i.terceroId)];
    case 'SUSCRIPCION': return [d(C.SUSCRIPCION_POR_COBRAR, i.monto, 'OTRO', i.terceroId), h(C.CAPITAL, i.monto, 'OTRO', i.terceroId)];
    case 'PAGO_SUSCRIPCION': return [d(cuentaMedioPago(i.medio ?? 'BANCO'), i.monto, 'OTRO'), h(C.SUSCRIPCION_POR_COBRAR, i.monto, 'OTRO', i.terceroId)];
    default: return [d(cuentaMedioPago(i.medio ?? 'BANCO'), i.monto, 'OTRO'), h(haber, i.monto, 'OTRO', i.terceroId)];
  }
}

export interface ActivoDepreciable { cuenta: string; valor: number; depreciado: number; tasaAnual: number }

/** Depreciación mensual en línea recta, sin exceder el valor del bien. */
export function cuotaDepreciacion(a: ActivoDepreciable): number {
  return Math.min(Math.round((a.valor * a.tasaAnual) / 12), a.valor - a.depreciado);
}

export function depreciacionMes(activos: ActivoDepreciable[], area: Area): Linea[] {
  const porCuenta = new Map<string, number>();
  let total = 0;
  for (const a of activos) {
    const c = cuotaDepreciacion(a);
    if (c <= 0) continue;
    const acum = DEPRECIACION_ACUMULADA[a.cuenta] ?? '3913';
    porCuenta.set(acum, (porCuenta.get(acum) ?? 0) + c);
    total += c;
  }
  if (!total) return [];
  return [
    d(C.DEPRECIACION, total, 'PROVISION'),
    ...[...porCuenta].map(([cta, m]) => h(cta, m, 'PROVISION')),
    d(AREA_CUENTA[area], total, 'DESTINO'), h(C.DEST_CONTRAPARTIDA, total, 'DESTINO'),
  ];
}

/** Liquidación mensual: compensa el IGV de ventas (haber) contra el de compras (debe). */
export function liquidacionIgv(igvVentas: number, igvCompras: number): Linea[] {
  if (igvVentas === 0 && igvCompras === 0) return [];
  const ls: Linea[] = [d(C.IGV, igvVentas, 'OTRO'), h(C.IGV, igvCompras, 'OTRO')];
  if (igvVentas >= igvCompras) ls.push(h(C.IGV_SALDO, igvVentas - igvCompras, 'OTRO'));
  else ls.push(d(C.IGV_SALDO, igvCompras - igvVentas, 'OTRO'));
  return sinCeros(ls);
}
