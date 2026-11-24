import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from './auditoria.service';
import { ErrorCampo, fechaDate, PERIODO } from '../common/errores';
import { aSoles, aCentimos, Linea, totales } from '../motor-asientos';

export type Tx = Prisma.TransactionClient;

export interface NuevoAsiento {
  fecha: string;
  operacion: string;
  glosa: string;
  lineas: Linea[];
  usuarioId?: number;
  revierteA?: number;
  /** Administrador que escribe en un periodo cerrado, con motivo registrado. */
  forzarPeriodo?: { motivo: string };
  /** Omite la regla de destino (reversiones, regularización, cierre y apertura). */
  sinDestino?: boolean;
}

const GRUPOS_DESTINO = ['92', '94', '95', '97'];

@Injectable()
export class AsientosService {
  constructor(private prisma: PrismaService, private audit: AuditoriaService) {}

  async periodoCerrado(fecha: string, tx: Tx | PrismaService = this.prisma): Promise<boolean> {
    const anio = Number(fecha.slice(0, 4));
    const mes = Number(fecha.slice(5, 7));
    const p = await tx.periodo.findUnique({ where: { anio_mes: { anio, mes } } });
    return !!p?.cerrado;
  }

  /** Valida y guarda un asiento. Debe = Haber, cuentas de último nivel activas, periodo abierto. */
  async crear(tx: Tx, a: NuevoAsiento) {
    if (a.lineas.length < 2) throw new ErrorCampo('lineas', 'Un asiento necesita al menos dos líneas');
    for (const l of a.lineas) {
      if (l.debe < 0 || l.haber < 0 || (l.debe > 0 && l.haber > 0)) throw new ErrorCampo('lineas', `La línea de ${l.cuenta} debe tener importe en un solo lado`);
    }
    const t = totales(a.lineas);
    if (!t.cuadra) throw new ErrorCampo('lineas', `No cuadra: Debe ${aSoles(t.debe).toFixed(2)} y Haber ${aSoles(t.haber).toFixed(2)}`);

    const codigos = [...new Set(a.lineas.map((l) => l.cuenta))];
    const cuentas = await tx.cuenta.findMany({ where: { codigo: { in: codigos } } });
    const mapa = new Map(cuentas.map((c) => [c.codigo, c]));
    for (const cod of codigos) {
      const c = mapa.get(cod);
      if (!c) throw new ErrorCampo('lineas', `La cuenta ${cod} no existe`);
      if (!c.activa) throw new ErrorCampo('lineas', `La cuenta ${cod} está inactiva`);
      if (!c.ultimoNivel) throw new ErrorCampo('lineas', `La cuenta ${cod} no es de último nivel`);
    }

    if (!a.sinDestino) {
      const pideDestino = a.lineas.some((l) => l.debe > 0 && mapa.get(l.cuenta)?.requiereDestino);
      if (pideDestino) {
        const tieneDestino = a.lineas.some((l) => l.debe > 0 && GRUPOS_DESTINO.includes(l.cuenta)) && a.lineas.some((l) => l.haber > 0 && l.cuenta === '791');
        if (!tieneDestino) throw new ErrorCampo('lineas', 'Las cuentas de gasto (62 a 68) requieren destino: agrega la línea del 94, 95, 97 o 92 contra la 791');
      }
    }

    if (await this.periodoCerrado(a.fecha, tx)) {
      if (!a.forzarPeriodo) throw new ErrorCampo('fecha', `El periodo ${PERIODO(a.fecha)} está cerrado`);
      await this.audit.registrar(a.usuarioId, 'FORZAR_PERIODO_CERRADO', 'Asiento', undefined, `${PERIODO(a.fecha)}: ${a.forzarPeriodo.motivo}`, tx as any);
    }

    // Numeración correlativa sin huecos ni duplicados bajo concurrencia.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7001)`;
    const ultimo = await tx.asiento.aggregate({ _max: { numero: true } });
    const numero = (ultimo._max.numero ?? 0) + 1;

    const asiento = await tx.asiento.create({
      data: {
        numero, fecha: fechaDate(a.fecha), periodo: PERIODO(a.fecha), operacion: a.operacion, glosa: a.glosa, usuarioId: a.usuarioId, revierteA: a.revierteA,
        lineas: { create: a.lineas.map((l, i) => ({ orden: i + 1, cuentaCodigo: l.cuenta, debe: aSoles(l.debe), haber: aSoles(l.haber), etapa: l.etapa, terceroId: l.terceroId })) },
      },
      include: { lineas: true },
    });
    await Promise.all(codigos.map((cod) => tx.cuenta.update({ where: { codigo: cod }, data: { uso: { increment: 1 } } })));
    await this.audit.registrar(a.usuarioId, 'CREAR', 'Asiento', asiento.id, `N.º ${numero} ${a.operacion}`, tx as any);
    return asiento;
  }

  /**
   * Anula un asiento con un asiento de reversión (nunca se borra). Si nació de un documento,
   * pago o movimiento de kárdex, también revierte esos efectos.
   */
  async anular(id: number, motivo: string, usuario: { id: number; rol: string }) {
    if (!motivo?.trim()) throw new ErrorCampo('motivo', 'Indica el motivo de la anulación');
    return this.prisma.$transaction(async (tx) => {
      const orig = await tx.asiento.findUnique({ where: { id }, include: { lineas: { orderBy: { orden: 'asc' } } } });
      if (!orig) throw new NotFoundException('Asiento no encontrado');
      if (orig.estado === 'ANULADO') throw new ErrorCampo('id', 'Este asiento ya fue anulado');
      if (orig.revierteA) throw new ErrorCampo('id', 'Una reversión no se puede anular; registra el asiento correcto');

      const docs = await tx.documento.findMany({ where: { asientoId: id }, include: { pagos: true } });
      for (const d of docs) {
        const externos = d.pagos.filter((p) => p.asientoId !== id);
        if (externos.length) throw new ErrorCampo('id', `El documento ${d.serie}-${d.numero} tiene cobros o pagos; anúlalos primero`);
        await tx.pago.deleteMany({ where: { documentoId: d.id } });
        await tx.documento.update({ where: { id: d.id }, data: { anulado: true, saldo: 0 } });
      }
      const pago = await tx.pago.findFirst({ where: { asientoId: id } });
      if (pago) {
        const doc = await tx.documento.findUniqueOrThrow({ where: { id: pago.documentoId } });
        await tx.documento.update({ where: { id: doc.id }, data: { saldo: new Prisma.Decimal(doc.saldo).plus(pago.monto) } });
        await tx.pago.delete({ where: { id: pago.id } });
      }
      const movs = await tx.kardexMov.findMany({ where: { asientoId: id } });
      for (const m of movs) {
        const p = await tx.producto.findUniqueOrThrow({ where: { id: m.productoId } });
        const esEntrada = m.tipo === 'ENTRADA';
        const cant = esEntrada ? new Prisma.Decimal(p.stock).minus(m.cantidad) : new Prisma.Decimal(p.stock).plus(m.cantidad);
        if (cant.lt(0)) throw new ErrorCampo('id', `No se puede anular: el stock de ${p.nombre} ya fue consumido`);
        const costoActual = new Prisma.Decimal(p.valorTotal);
        const costo = esEntrada ? costoActual.minus(m.costoTotal) : costoActual.plus(m.costoTotal);
        await tx.producto.update({ where: { id: p.id }, data: { stock: cant, valorTotal: cant.gt(0) ? costo : 0, costoPromedio: cant.gt(0) ? costo.div(cant) : 0 } });
        await tx.kardexMov.create({ data: { productoId: p.id, fecha: m.fecha, tipo: esEntrada ? 'SALIDA' : 'ENTRADA', cantidad: m.cantidad, costoUnit: m.costoUnit, costoTotal: m.costoTotal, saldoCant: cant, saldoCosto: costo.toDecimalPlaces(2), asientoId: id } });
      }
      await tx.activoFijo.updateMany({ where: { documentoId: { in: docs.map((d) => d.id) } }, data: { estado: 'BAJA' } });

      const hoy = new Date().toISOString().slice(0, 10);
      const fechaRev = (await this.periodoCerrado(orig.fecha.toISOString().slice(0, 10), tx)) ? hoy : orig.fecha.toISOString().slice(0, 10);
      const rev = await this.crear(tx, {
        fecha: fechaRev, operacion: 'REVERSION', glosa: `Reversión del asiento N.º ${orig.numero}: ${motivo}`, usuarioId: usuario.id, revierteA: orig.id, sinDestino: true,
        lineas: orig.lineas.map((l) => ({ cuenta: l.cuentaCodigo, debe: aCentimos(l.haber.toString()), haber: aCentimos(l.debe.toString()), etapa: l.etapa, terceroId: l.terceroId ?? undefined })),
      });
      await tx.asiento.update({ where: { id }, data: { estado: 'ANULADO', motivoAnulacion: motivo, reversionId: rev.id } });
      await this.audit.registrar(usuario.id, 'ANULAR', 'Asiento', id, motivo, tx as any);
      return { anulado: id, reversion: rev.id, numeroReversion: rev.numero };
    });
  }
}
