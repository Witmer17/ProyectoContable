// Tipos del motor de asientos. Todos los importes son enteros en céntimos.
export type Etapa = 'PROVISION' | 'DESTINO' | 'CANCELACION' | 'COSTO' | 'BAJA' | 'OTRO';
export type ModoIgv = 'INCLUYE' | 'MAS' | 'SIN';
export type Condicion = 'CONTADO_EFECTIVO' | 'CONTADO_BANCO' | 'CREDITO';
export type Area = 'ADMINISTRACION' | 'VENTAS' | 'FINANCIERO' | 'PRODUCCION';

export interface Linea {
  cuenta: string;
  debe: number;
  haber: number;
  etapa: Etapa;
  terceroId?: number;
}

export interface Montos {
  base: number;
  igv: number;
  total: number;
}

export interface Totales {
  debe: number;
  haber: number;
  cuadra: boolean;
}
