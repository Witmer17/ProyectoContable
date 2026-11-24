// Kárdex por costo promedio ponderado. Los costos son céntimos; el costo unitario se
// trunca a 4 decimales de sol (convención de las prácticas) y el costo de salida se redondea a céntimo.
export interface SaldoKardex {
  cantidad: number;
  costo: number; // costo total en céntimos
}

export function costoUnitario4(s: SaldoKardex): number {
  // en diezmilésimas de sol
  return s.cantidad > 0 ? Math.floor((s.costo * 100) / s.cantidad) : 0;
}

export function entradaKardex(s: SaldoKardex, cantidad: number, costoTotal: number): SaldoKardex {
  return { cantidad: s.cantidad + cantidad, costo: s.costo + costoTotal };
}

export function salidaKardex(s: SaldoKardex, cantidad: number): { costoSalida: number; saldo: SaldoKardex } {
  if (cantidad > s.cantidad) throw new Error(`Stock insuficiente: hay ${s.cantidad} y se piden ${cantidad}`);
  const costoSalida = cantidad === s.cantidad ? s.costo : Math.round((costoUnitario4(s) * cantidad) / 100);
  return { costoSalida, saldo: { cantidad: s.cantidad - cantidad, costo: s.costo - costoSalida } };
}
