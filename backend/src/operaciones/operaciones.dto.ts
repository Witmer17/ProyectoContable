import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Min, ValidateNested } from 'class-validator';

export const TIPOS_OPERACION = [
  'COMPRA_MERCADERIA', 'COMPRA_ACTIVO', 'PAGO_SERVICIO', 'HONORARIOS', 'VENTA_MERCADERIA', 'VENTA_SERVICIO', 'VENTA_ACTIVO',
  'COBRANZA', 'PAGO_PROVEEDOR', 'PLANILLA', 'APORTE_CAPITAL', 'DEPRECIACION', 'LIQUIDACION_IGV', 'ESPECIAL', 'MANUAL', 'APERTURA',
] as const;
export type TipoOperacion = (typeof TIPOS_OPERACION)[number];

export class ItemDto {
  @IsInt() productoId: number;
  @IsNumber() @Min(0.0001) cantidad: number;
  /** Importe de la línea en la moneda del documento y según el modo de IGV elegido. */
  @IsNumber() @Min(0) monto: number;
}

export class LineaManualDto {
  @IsString() cuenta: string;
  @IsOptional() @IsNumber() @Min(0) debe?: number;
  @IsOptional() @IsNumber() @Min(0) haber?: number;
  @IsOptional() @IsInt() terceroId?: number;
}

export class TrabajadorDto {
  @IsInt() terceroId: number;
  @IsOptional() @IsNumber() @Min(0) sueldo?: number;
  @IsOptional() @IsEnum(['ONP', 'AFP']) pension?: 'ONP' | 'AFP';
}

export class PendienteDto {
  @IsEnum(['COMPRA', 'VENTA']) sentido: 'COMPRA' | 'VENTA';
  @IsInt() terceroId: number;
  @IsString() tipo: string;
  @IsString() serie: string;
  @IsString() numero: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha: string;
  @IsNumber() @Min(0.01) total: number;
}

export class ExistenciaDto {
  @IsInt() productoId: number;
  @IsNumber() @Min(0.0001) cantidad: number;
  @IsNumber() @Min(0) costoTotal: number;
}

export class ActivoAperturaDto {
  @IsString() nombre: string;
  @IsString() cuenta: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) fechaCompra: string;
  @IsNumber() valor: number;
  @IsNumber() depreciado: number;
  @IsOptional() @IsNumber() tasaAnual?: number;
}

export class OperacionDto {
  @IsEnum(TIPOS_OPERACION) tipo: TipoOperacion;
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato AAAA-MM-DD' }) fecha: string;
  @IsOptional() @IsInt() terceroId?: number;

  // Comprobante
  @IsOptional() @IsString() tipoComprobante?: string; // 01, 03, 07, 08, RH, OT
  @IsOptional() @IsString() serie?: string;
  @IsOptional() @IsString() numero?: string;

  // Montos
  @IsOptional() @IsEnum(['INCLUYE', 'MAS', 'SIN']) modoIgv?: 'INCLUYE' | 'MAS' | 'SIN';
  @IsOptional() @IsNumber() @Min(0) monto?: number;
  @IsOptional() @IsNumber() @Min(0) igvManual?: number;
  @IsOptional() @IsEnum(['PEN', 'USD']) moneda?: 'PEN' | 'USD';
  @IsOptional() @IsNumber() @Min(0) tipoCambio?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ItemDto) items?: ItemDto[];

  // Pago
  @IsOptional() @IsEnum(['CONTADO_EFECTIVO', 'CONTADO_BANCO', 'CREDITO']) condicion?: 'CONTADO_EFECTIVO' | 'CONTADO_BANCO' | 'CREDITO';
  @IsOptional() @IsString() cuentaBancaria?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) vencimiento?: string;
  @IsOptional() @IsEnum(['EFECTIVO', 'BANCO']) medio?: 'EFECTIVO' | 'BANCO';

  // Cuenta / concepto
  @IsOptional() @IsString() cuenta?: string;
  @IsOptional() @IsString() concepto?: string;
  @IsOptional() @IsEnum(['ADMINISTRACION', 'VENTAS', 'FINANCIERO', 'PRODUCCION']) area?: 'ADMINISTRACION' | 'VENTAS' | 'FINANCIERO' | 'PRODUCCION';
  @IsOptional() @IsBoolean() pagado?: boolean;

  // Cobranza / pago a proveedor
  @IsOptional() @IsInt() documentoId?: number;

  // Venta de activo
  @IsOptional() @IsInt() activoId?: number;

  // Planilla
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TrabajadorDto) trabajadores?: TrabajadorDto[];

  // Capital
  @IsOptional() @IsEnum(['DINERO', 'BIEN', 'SUSCRIPCION', 'PAGO_SUSCRIPCION']) tipoAporte?: 'DINERO' | 'BIEN' | 'SUSCRIPCION' | 'PAGO_SUSCRIPCION';
  @IsOptional() @IsBoolean() aumento?: boolean;

  // Plantillas especiales
  @IsOptional() @IsString() plantilla?: string;
  @IsOptional() @IsNumber() @Min(0) interes?: number;

  // Asiento manual / apertura
  @IsOptional() @IsString() glosa?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => LineaManualDto) lineas?: LineaManualDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PendienteDto) pendientes?: PendienteDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ExistenciaDto) existencias?: ExistenciaDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ActivoAperturaDto) activos?: ActivoAperturaDto[];

  /** Solo administrador: registrar en un periodo cerrado. */
  @IsOptional() @IsString() motivoPeriodoCerrado?: string;
}
