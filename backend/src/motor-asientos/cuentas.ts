// Única fuente de los códigos de cuenta usados por el motor (sección 17 del requerimiento).
// Si una cuenta no coincide con el PCGE vigente, se corrige aquí y en el catálogo (M2).
import { Area } from './tipos';

export const C = {
  CAJA: '101',
  BANCO: '1041',
  FACTURAS_POR_COBRAR: '1212',
  ANTICIPO_CLIENTE: '122',
  SUSCRIPCION_POR_COBRAR: '1421',
  MERCADERIAS: '20111',
  PRODUCTOS_TERMINADOS: '2111',
  MATERIAS_PRIMAS: '2411',
  IGV: '40111',
  IGV_SALDO: '4011',
  RETENCION_4TA: '40172',
  ESSALUD: '40311',
  ONP: '40321',
  AFP: '4071',
  REMUNERACIONES_POR_PAGAR: '4111',
  DIVIDENDOS_POR_PAGAR: '4411',
  FACTURAS_POR_PAGAR: '4212',
  ANTICIPO_PROVEEDOR: '422',
  HONORARIOS_POR_PAGAR: '4241',
  PRESTAMOS: '45',
  CAPITAL: '501',
  APORTES_EN_TRAMITE: '5221',
  UTILIDADES_ACUMULADAS: '591',
  COMPRA_MERCADERIA: '6011',
  COMPRA_MATERIA_PRIMA: '6021',
  VARIACION_MERCADERIAS: '6111', // destino de compras (611 = grupo; 6111 = subcuenta de último nivel)
  VARIACION_MATERIAS_PRIMAS: '6121',
  SUELDOS: '6211',
  ESSALUD_GASTO: '6271',
  HONORARIOS_GASTO: '6323',
  INTERESES: '67',
  DEPRECIACION: '6814',
  COSTO_VENTA_MERCADERIA: '6911',
  COSTO_VENTA_PRODUCTO: '6921',
  VENTA_NO_DEVENGADA: '709',
  COSTO_NETO_ACTIVOS: '655',
  VENTA_MERCADERIA: '7012',
  VENTA_PRODUCTO: '702',
  VENTA_SERVICIO: '704',
  REBAJAS_CONCEDIDAS: '74',
  VENTA_ACTIVOS: '756',
  DEST_ADMIN: '94',
  DEST_VENTAS: '95',
  DEST_FINANCIERO: '97',
  DEST_PRODUCCION: '92',
  DEST_CONTRAPARTIDA: '791',
  RESULTADO_UTILIDAD: '891',
  RESULTADO_PERDIDA: '892',
} as const;

export const AREA_CUENTA: Record<Area, string> = {
  ADMINISTRACION: C.DEST_ADMIN,
  VENTAS: C.DEST_VENTAS,
  FINANCIERO: C.DEST_FINANCIERO,
  PRODUCCION: C.DEST_PRODUCCION,
};

/** Depreciación acumulada correspondiente a cada cuenta de activo fijo. */
export const DEPRECIACION_ACUMULADA: Record<string, string> = {
  '332': '3911',
  '333': '3912',
  '3341': '3913',
  '3351': '3914',
  '336': '3915',
};

export const TASA_DEPRECIACION_DEFECTO: Record<string, number> = {
  '332': 0.05,
  '333': 0.1,
  '3341': 0.2,
  '3351': 0.1,
  '336': 0.25,
};
