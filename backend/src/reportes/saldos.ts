import { PrismaService } from '../prisma/prisma.service';

export interface SaldoCuenta { cuenta: string; nombre: string; elemento: number; naturaleza: string; debe: number; haber: number }

/**
 * Suma de Debe y Haber por cuenta entre fechas (ambas inclusivas, ISO). Incluye asientos anulados
 * y sus reversiones: se compensan entre sí y así el balance coincide con el diario.
 */
export async function sumasPorCuenta(prisma: PrismaService, desde: string | null, hasta: string | null): Promise<SaldoCuenta[]> {
  const d = desde ? new Date(`${desde}T00:00:00Z`) : new Date('1900-01-01T00:00:00Z');
  const h = hasta ? new Date(`${hasta}T00:00:00Z`) : new Date('2999-12-31T00:00:00Z');
  const rows = await prisma.$queryRaw<{ cuenta: string; nombre: string; elemento: number; naturaleza: string; debe: unknown; haber: unknown }[]>`
    SELECT l."cuentaCodigo" AS cuenta, c.nombre, c.elemento, c.naturaleza, SUM(l.debe) AS debe, SUM(l.haber) AS haber
    FROM "AsientoLinea" l
    JOIN "Asiento" a ON a.id = l."asientoId"
    JOIN "Cuenta" c ON c.codigo = l."cuentaCodigo"
    WHERE a.fecha >= ${d} AND a.fecha <= ${h}
    GROUP BY l."cuentaCodigo", c.nombre, c.elemento, c.naturaleza
    ORDER BY l."cuentaCodigo"`;
  return rows.map((r) => ({ cuenta: r.cuenta, nombre: r.nombre, elemento: Number(r.elemento), naturaleza: r.naturaleza, debe: Number(r.debe), haber: Number(r.haber) }));
}

export const saldoDeudor = (s: { debe: number; haber: number }) => Math.round((s.debe - s.haber) * 100) / 100;
export const r2 = (n: number) => Math.round(n * 100) / 100;
