import { Condicion, Linea, Montos, ModoIgv, Totales } from './tipos';
import { C } from './cuentas';

/** Convierte un importe decimal (soles) a céntimos enteros. */
export const aCentimos = (v: number | string): number => Math.round(Number(v) * 100);
export const aSoles = (c: number): number => c / 100;

/** Convierte un importe en moneda extranjera a soles con el tipo de cambio (antes de calcular IGV). */
export function convertirASoles(montoCentimos: number, tipoCambio: number): number {
  return Math.round(montoCentimos * tipoCambio);
}

/**
 * Calcula base, IGV y total. Redondeo: la base se redondea a 2 decimales y el IGV
 * es la diferencia (Total - Base), así Base + IGV = Total siempre.
 */
export function calcularMontos(modo: ModoIgv, monto: number, tasaIgv = 0.18): Montos {
  const bp = Math.round(tasaIgv * 10000);
  if (modo === 'SIN') return { base: monto, igv: 0, total: monto };
  if (modo === 'MAS') {
    const igv = Math.round((monto * bp) / 10000);
    return { base: monto, igv, total: monto + igv };
  }
  const base = Math.round((monto * 10000) / (10000 + bp));
  return { base, igv: monto - base, total: monto };
}

export function totales(lineas: Linea[]): Totales {
  const debe = lineas.reduce((s, l) => s + l.debe, 0);
  const haber = lineas.reduce((s, l) => s + l.haber, 0);
  return { debe, haber, cuadra: debe === haber && debe > 0 };
}

export const esContado = (c: Condicion) => c !== 'CREDITO';
export const cuentaMedio = (c: Condicion): string => (c === 'CONTADO_BANCO' ? C.BANCO : C.CAJA);
export const cuentaMedioPago = (medio: 'EFECTIVO' | 'BANCO'): string => (medio === 'BANCO' ? C.BANCO : C.CAJA);

export const d = (cuenta: string, monto: number, etapa: Linea['etapa'], terceroId?: number): Linea => ({
  cuenta, debe: monto, haber: 0, etapa, terceroId,
});
export const h = (cuenta: string, monto: number, etapa: Linea['etapa'], terceroId?: number): Linea => ({
  cuenta, debe: 0, haber: monto, etapa, terceroId,
});
