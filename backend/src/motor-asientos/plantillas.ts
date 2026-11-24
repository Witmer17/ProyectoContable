import { Linea, Montos } from './tipos';
import { C } from './cuentas';
import { cuentaMedioPago, d, h } from './montos';

type Medio = 'EFECTIVO' | 'BANCO';

// Plantillas adicionales de la sección 6. Cada una devuelve las líneas del asiento.
export const PLANTILLAS = {
  /** Nota de crédito emitida (devolución de ventas). */
  notaCreditoEmitida: (m: Montos, terceroId?: number): Linea[] => [
    d(C.VENTA_NO_DEVENGADA, m.base, 'PROVISION'), d(C.IGV, m.igv, 'PROVISION'), h(C.FACTURAS_POR_COBRAR, m.total, 'PROVISION', terceroId),
  ],
  rebajaConcedida: (m: Montos, terceroId?: number): Linea[] => [
    d(C.REBAJAS_CONCEDIDAS, m.base, 'PROVISION'), d(C.IGV, m.igv, 'PROVISION'), h(C.FACTURAS_POR_COBRAR, m.total, 'PROVISION', terceroId),
  ],
  devolucionCompra: (m: Montos, terceroId?: number): Linea[] => [
    d(C.FACTURAS_POR_PAGAR, m.total, 'PROVISION', terceroId), h(C.COMPRA_MERCADERIA, m.base, 'PROVISION'), h(C.IGV, m.igv, 'PROVISION'),
    d(C.VARIACION_MERCADERIAS, m.base, 'DESTINO'), h(C.MERCADERIAS, m.base, 'DESTINO'),
  ],
  anticipoCliente: (m: Montos, medio: Medio, terceroId?: number): Linea[] => [
    d(cuentaMedioPago(medio), m.total, 'PROVISION'), h(C.ANTICIPO_CLIENTE, m.total - m.igv, 'PROVISION', terceroId), h(C.IGV, m.igv, 'PROVISION'),
  ].filter((l) => l.debe || l.haber),
  anticipoProveedor: (monto: number, medio: Medio, terceroId?: number): Linea[] => [
    d(C.ANTICIPO_PROVEEDOR, monto, 'PROVISION', terceroId), h(cuentaMedioPago(medio), monto, 'PROVISION'),
  ],
  prestamoRecibido: (monto: number): Linea[] => [d(C.BANCO, monto, 'PROVISION'), h(C.PRESTAMOS, monto, 'PROVISION')],
  /** El interés (67) va con destino a 97. */
  pagoCuotaPrestamo: (capital: number, interes: number): Linea[] => [
    d(C.PRESTAMOS, capital, 'PROVISION'), d(C.INTERESES, interes, 'PROVISION'), h(C.BANCO, capital + interes, 'PROVISION'),
    d(C.DEST_FINANCIERO, interes, 'DESTINO'), h(C.DEST_CONTRAPARTIDA, interes, 'DESTINO'),
  ].filter((l) => l.debe || l.haber),
  dividendos: (monto: number, terceroId?: number): Linea[] => [d(C.UTILIDADES_ACUMULADAS, monto, 'PROVISION'), h(C.DIVIDENDOS_POR_PAGAR, monto, 'PROVISION', terceroId)],
  pagoDividendos: (monto: number, terceroId?: number): Linea[] => [d(C.DIVIDENDOS_POR_PAGAR, monto, 'CANCELACION', terceroId), h(C.BANCO, monto, 'CANCELACION')],
};

export type NombrePlantilla = keyof typeof PLANTILLAS;
