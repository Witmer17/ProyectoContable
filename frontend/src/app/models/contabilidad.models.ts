export interface DetalleAsiento {
  codigo_detalle?: number;
  linea_numero: number;
  codigo_cuenta: number;
  nombre_cuenta?: string;
  debe: number;
  haber: number;
  saldo_deudor?: number;
  saldo_acreedor?: number;
  observaciones?: string;
}

export interface HistorialCambio {
  fecha_cambio?: string;
  usuario: string;
  cambio: string;
  razon?: string;
}

export interface AsientoContable {
  partida: number;
  codigo_ejercicio: number;
  fecha: string;
  concepto: string;
  tipo_asiento: string;
  codigo_moneda: number;
  tipo_cambio: number;
  monto_moneda_origen: number;
  debe_total: number;
  haber_total: number;
  estado: string;
  version: number;
  observaciones?: string;
  detalles: DetalleAsiento[];
  historial_cambios: HistorialCambio[];
  url_recurso?: string;
}

export interface CuentaPCGE {
  codigo: number;
  codigo_tipo: number;
  codigo_nivel: number;
  nombre: string;
  descripcion?: string;
  es_auxiliar: boolean;
  requiere_analitica?: boolean;
  estado: string;
  saldo_mayor: number;
}

export interface PeriodoFiscal {
  codigo_bloqueo?: number;
  codigo_ejercicio: number;
  mes: number;
  estado_bloqueo: 'ABIERTO' | 'PROVISIONAL' | 'DEFINITIVO';
  fecha_bloqueo?: string;
  usuario_bloqueo?: string;
  razon_bloqueo?: string;
}

export interface KPIsContables {
  ejercicio: number;
  total_asientos: number;
  asientos_validados: number;
  asientos_anulados: number;
  asientos_rectificados: number;
  suma_debe_acumulada: number;
  suma_haber_acumulada: number;
  diferencia_cuadre: number;
  cuadre_perfecto: boolean;
  total_cuentas_pcge: number;
  periodos_abiertos: number;
  periodos_cerrados: number;
}

export interface BalanceComprobacionItem {
  codigo_cuenta: number;
  nombre_cuenta: string;
  elemento: number;
  suma_debe: number;
  suma_haber: number;
  saldo_deudor: number;
  saldo_acreedor: number;
}

export interface CrearAsientoPayload {
  fecha: string;
  concepto: string;
  tipo_asiento: string;
  codigo_moneda: number;
  tipo_cambio: number;
  detalles: {
    codigo_cuenta: number;
    debe: number;
    haber: number;
    observaciones?: string;
  }[];
  usuario?: string;
  observaciones?: string;
}

export interface RectificarAsientoPayload {
  razon_rectificacion: string;
  detalles_nuevos: {
    codigo_cuenta: number;
    debe: number;
    haber: number;
    observaciones?: string;
  }[];
  concepto_nuevo?: string;
  usuario?: string;
}

export interface FacturaVentaPayload {
  numero_factura: string;
  fecha: string;
  cliente_ruc: string;
  total_venta: number;
  igv: number;
  base_imponible: number;
  usuario?: string;
}
