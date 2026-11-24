// Catálogo reducido del PCGE 2019 (cuentas de último nivel usadas por el sistema).
// `perfiles`: actividades en que aparece (vacío = todas). `modulo`: opción del perfil que la activa.
export interface CuentaDef {
  codigo: string;
  nombre: string;
  naturaleza: 'DEUDORA' | 'ACREEDORA';
  perfiles?: string[];
  modulo?: 'PLANILLA' | 'ACTIVOS' | 'DOLARES' | 'HONORARIOS';
  requiereDestino?: boolean;
  destinoDefecto?: string;
}

const COM = ['COMERCIAL', 'MIXTA'];
const IND = ['INDUSTRIAL', 'MIXTA'];
const MERC = ['COMERCIAL', 'INDUSTRIAL', 'MIXTA'];
const SERV = ['SERVICIOS', 'MIXTA'];

const D = 'DEUDORA' as const;
const A = 'ACREEDORA' as const;
const gasto = (codigo: string, nombre: string, extra: Partial<CuentaDef> = {}): CuentaDef => ({ codigo, nombre, naturaleza: D, requiereDestino: true, destinoDefecto: '94', ...extra });

export const CATALOGO: CuentaDef[] = [
  { codigo: '101', nombre: 'Caja', naturaleza: D },
  { codigo: '1041', nombre: 'Cuentas corrientes operativas', naturaleza: D },
  { codigo: '1212', nombre: 'Facturas, boletas y otros comprobantes por cobrar - Emitidas en cartera', naturaleza: D },
  { codigo: '122', nombre: 'Anticipos recibidos de clientes', naturaleza: A },
  { codigo: '1421', nombre: 'Accionistas (socios) - Suscripciones por cobrar', naturaleza: D },
  { codigo: '20111', nombre: 'Mercaderías manufacturadas - Costo', naturaleza: D, perfiles: MERC },
  { codigo: '2111', nombre: 'Productos terminados - Costo', naturaleza: D, perfiles: IND },
  { codigo: '2411', nombre: 'Materias primas - Costo', naturaleza: D, perfiles: IND },
  { codigo: '332', nombre: 'Edificaciones', naturaleza: D, modulo: 'ACTIVOS' },
  { codigo: '333', nombre: 'Maquinaria y equipo de explotación', naturaleza: D, modulo: 'ACTIVOS' },
  { codigo: '3341', nombre: 'Unidades de transporte - Vehículos', naturaleza: D, modulo: 'ACTIVOS' },
  { codigo: '3351', nombre: 'Muebles y enseres', naturaleza: D, modulo: 'ACTIVOS' },
  { codigo: '336', nombre: 'Equipos diversos', naturaleza: D, modulo: 'ACTIVOS' },
  { codigo: '3911', nombre: 'Depreciación acumulada - Edificaciones', naturaleza: A, modulo: 'ACTIVOS' },
  { codigo: '3912', nombre: 'Depreciación acumulada - Maquinaria y equipo', naturaleza: A, modulo: 'ACTIVOS' },
  { codigo: '3913', nombre: 'Depreciación acumulada - Unidades de transporte', naturaleza: A, modulo: 'ACTIVOS' },
  { codigo: '3914', nombre: 'Depreciación acumulada - Muebles y enseres', naturaleza: A, modulo: 'ACTIVOS' },
  { codigo: '3915', nombre: 'Depreciación acumulada - Equipos diversos', naturaleza: A, modulo: 'ACTIVOS' },
  { codigo: '4011', nombre: 'IGV - Saldo de liquidación mensual', naturaleza: A },
  { codigo: '40111', nombre: 'IGV - Cuenta propia', naturaleza: A },
  { codigo: '40172', nombre: 'Renta de cuarta categoría retenida', naturaleza: A, modulo: 'HONORARIOS' },
  { codigo: '40311', nombre: 'ESSALUD por pagar', naturaleza: A, modulo: 'PLANILLA' },
  { codigo: '40321', nombre: 'ONP por pagar', naturaleza: A, modulo: 'PLANILLA' },
  { codigo: '4071', nombre: 'Administradoras de fondos de pensiones (AFP)', naturaleza: A, modulo: 'PLANILLA' },
  { codigo: '4111', nombre: 'Sueldos y salarios por pagar', naturaleza: A, modulo: 'PLANILLA' },
  { codigo: '4212', nombre: 'Facturas, boletas y otros comprobantes por pagar - Emitidas', naturaleza: A },
  { codigo: '422', nombre: 'Anticipos otorgados a proveedores', naturaleza: D },
  { codigo: '4241', nombre: 'Honorarios por pagar', naturaleza: A, modulo: 'HONORARIOS' },
  { codigo: '4411', nombre: 'Dividendos por pagar', naturaleza: A },
  { codigo: '45', nombre: 'Obligaciones financieras (préstamos)', naturaleza: A },
  { codigo: '501', nombre: 'Capital social', naturaleza: A },
  { codigo: '5221', nombre: 'Aportes en trámite de aumento de capital', naturaleza: A },
  { codigo: '591', nombre: 'Resultados acumulados - Utilidades acumuladas', naturaleza: A },
  { codigo: '592', nombre: 'Resultados acumulados - Pérdidas acumuladas', naturaleza: D },
  { codigo: '6011', nombre: 'Mercaderías - Compras', naturaleza: D, perfiles: MERC },
  { codigo: '6021', nombre: 'Materias primas - Compras', naturaleza: D, perfiles: IND },
  gasto('6211', 'Sueldos y salarios', { modulo: 'PLANILLA' }),
  gasto('6271', 'Régimen de prestaciones de salud (ESSALUD)', { modulo: 'PLANILLA' }),
  gasto('6323', 'Asesoría y consultoría - Honorarios', { modulo: 'HONORARIOS' }),
  gasto('6324', 'Servicios de personas naturales - Honorarios', { modulo: 'HONORARIOS' }),
  gasto('6341', 'Mantenimiento y reparación de inmuebles, maquinaria y equipo'),
  gasto('6361', 'Energía eléctrica'),
  gasto('6363', 'Agua'),
  gasto('6364', 'Teléfono e internet'),
  gasto('6371', 'Publicidad', { destinoDefecto: '95' }),
  gasto('6391', 'Otros servicios prestados por terceros'),
  gasto('6511', 'Útiles de oficina y suministros'),
  gasto('655', 'Costo neto de enajenación de activos inmovilizados', { modulo: 'ACTIVOS', requiereDestino: false }),
  gasto('67', 'Gastos financieros - Intereses', { destinoDefecto: '97' }),
  gasto('6814', 'Depreciación de inmuebles, maquinaria y equipo', { modulo: 'ACTIVOS' }),
  { codigo: '6111', nombre: 'Variación de existencias - Mercaderías', naturaleza: A, perfiles: MERC },
  { codigo: '6121', nombre: 'Variación de existencias - Materias primas', naturaleza: A, perfiles: IND },
  { codigo: '6911', nombre: 'Costo de ventas - Mercaderías', naturaleza: D, perfiles: COM },
  { codigo: '6921', nombre: 'Costo de ventas - Productos terminados', naturaleza: D, perfiles: IND },
  { codigo: '7012', nombre: 'Ventas de mercaderías - Gravadas', naturaleza: A, perfiles: COM },
  { codigo: '702', nombre: 'Ventas de productos terminados', naturaleza: A, perfiles: IND },
  { codigo: '704', nombre: 'Prestación de servicios', naturaleza: A, perfiles: SERV },
  { codigo: '709', nombre: 'Devoluciones sobre ventas', naturaleza: D },
  { codigo: '74', nombre: 'Descuentos, rebajas y bonificaciones concedidos', naturaleza: D },
  { codigo: '756', nombre: 'Enajenación de activos inmovilizados', naturaleza: A, modulo: 'ACTIVOS' },
  { codigo: '776', nombre: 'Diferencia de cambio - Ganancia', naturaleza: A, modulo: 'DOLARES' },
  { codigo: '676', nombre: 'Diferencia de cambio - Pérdida', naturaleza: D, modulo: 'DOLARES' },
  { codigo: '791', nombre: 'Cargas imputables a cuentas de costos y gastos', naturaleza: A },
  { codigo: '891', nombre: 'Resultado del ejercicio - Utilidad', naturaleza: A },
  { codigo: '892', nombre: 'Resultado del ejercicio - Pérdida', naturaleza: D },
  { codigo: '92', nombre: 'Costos de producción', naturaleza: D, perfiles: IND },
  { codigo: '94', nombre: 'Gastos administrativos', naturaleza: D },
  { codigo: '95', nombre: 'Gastos de ventas', naturaleza: D },
  { codigo: '97', nombre: 'Gastos financieros (destino)', naturaleza: D },
];

export const nivelDe = (codigo: string) => (codigo.length <= 2 ? codigo.length : codigo.length - 1);
