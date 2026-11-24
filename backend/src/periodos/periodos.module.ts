import { Body, Controller, Get, Module, Param, ParseIntPipe, Post, Query, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IsString, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AsientosModule } from '../asientos/asientos.module';
import { AsientosService } from '../asientos/asientos.service';
import { AuditoriaService } from '../asientos/auditoria.service';
import { CONTABLE, Roles, TODOS } from '../common/roles';
import { Usuario, UsuarioJwt } from '../common/usuario.decorator';
import { ErrorCampo } from '../common/errores';
import { aCentimos, C, Linea, totales } from '../motor-asientos';
import { sumasPorCuenta, saldoDeudor } from '../reportes/saldos';

class ClaveDto {
  @IsString() @MinLength(1) password: string;
}
class ReabrirDto extends ClaveDto {
  @IsString() @MinLength(3, { message: 'Indica el motivo' }) motivo: string;
}

@Controller('periodos')
export class PeriodosController {
  constructor(private prisma: PrismaService, private asientos: AsientosService, private audit: AuditoriaService) {}

  /** Nivel D: exige la clave del usuario como confirmación. */
  private async confirmar(u: UsuarioJwt, password: string) {
    const usr = await this.prisma.usuario.findUniqueOrThrow({ where: { id: u.id } });
    if (!(await bcrypt.compare(password, usr.passwordHash))) throw new UnauthorizedException('La clave de confirmación no es correcta');
  }

  @Get() @Roles(...TODOS)
  async listar(@Query('anio') anio?: string) {
    const a = Number(anio) || new Date().getUTCFullYear();
    const ps = await this.prisma.periodo.findMany({ where: { anio: a } });
    return Array.from({ length: 12 }, (_, i) => ({ anio: a, mes: i + 1, cerrado: ps.find((p) => p.mes === i + 1)?.cerrado ?? false, motivo: ps.find((p) => p.mes === i + 1)?.motivo }));
  }

  /** Cierre mensual: bloquea cualquier asiento de ese mes. */
  @Post(':anio/:mes/cerrar') @Roles(...CONTABLE)
  async cerrar(@Param('anio', ParseIntPipe) anio: number, @Param('mes', ParseIntPipe) mes: number, @Body() dto: ClaveDto, @Usuario() u: UsuarioJwt) {
    await this.confirmar(u, dto.password);
    const p = await this.prisma.periodo.upsert({ where: { anio_mes: { anio, mes } }, update: { cerrado: true, cerradoEn: new Date(), motivo: null }, create: { anio, mes, cerrado: true, cerradoEn: new Date() } });
    await this.audit.registrar(u.id, 'CERRAR_PERIODO', 'Periodo', `${anio}-${mes}`);
    return p;
  }

  @Post(':anio/:mes/reabrir')
  async reabrir(@Param('anio', ParseIntPipe) anio: number, @Param('mes', ParseIntPipe) mes: number, @Body() dto: ReabrirDto, @Usuario() u: UsuarioJwt) {
    await this.confirmar(u, dto.password);
    const p = await this.prisma.periodo.upsert({ where: { anio_mes: { anio, mes } }, update: { cerrado: false, motivo: dto.motivo }, create: { anio, mes, cerrado: false, motivo: dto.motivo } });
    await this.audit.registrar(u.id, 'REABRIR_PERIODO', 'Periodo', `${anio}-${mes}`, dto.motivo);
    return p;
  }

  /**
   * Cierre anual (nivel D): regularización de resultados (6, 7 y 9 contra 891/892), cierre de
   * saldos (1 a 5) y apertura del año siguiente (891/892 pasan a 591/592). Luego bloquea los 12 meses.
   */
  @Post('cierre-anual/:anio') @Roles(...CONTABLE)
  async cierreAnual(@Param('anio', ParseIntPipe) anio: number, @Body() dto: ClaveDto, @Usuario() u: UsuarioJwt) {
    await this.confirmar(u, dto.password);
    if (await this.prisma.asiento.findFirst({ where: { operacion: 'CIERRE', periodo: { startsWith: String(anio) }, estado: 'ACTIVO' } })) throw new ErrorCampo('anio', `El ejercicio ${anio} ya fue cerrado`);
    const fin = `${anio}-12-31`;
    const sig = `${anio + 1}-01-01`;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7002)`;
      const ss = await sumasPorCuenta(this.prisma, `${anio}-01-01`, fin);
      const sd = (s: (typeof ss)[number]) => aCentimos(saldoDeudor(s));

      // 1. Regularización: se cancela cada cuenta de resultados contra 891 (utilidad) o 892 (pérdida)
      const reg: Linea[] = [];
      for (const s of ss.filter((x) => [6, 7, 9].includes(x.elemento))) {
        const v = sd(s);
        if (v > 0) reg.push({ cuenta: s.cuenta, debe: 0, haber: v, etapa: 'OTRO' });
        else if (v < 0) reg.push({ cuenta: s.cuenta, debe: -v, haber: 0, etapa: 'OTRO' });
      }
      const neto = reg.reduce((a, l) => a + l.debe - l.haber, 0); // >0: utilidad
      if (neto > 0) reg.push({ cuenta: C.RESULTADO_UTILIDAD, debe: 0, haber: neto, etapa: 'OTRO' });
      else if (neto < 0) reg.push({ cuenta: C.RESULTADO_PERDIDA, debe: -neto, haber: 0, etapa: 'OTRO' });
      let regAs: number | undefined;
      if (reg.length >= 2) regAs = (await this.asientos.crear(tx, { fecha: fin, operacion: 'REGULARIZACION', glosa: `Regularización de resultados del ejercicio ${anio}`, lineas: reg, usuarioId: u.id, sinDestino: true })).id;

      // 2. Cierre de las cuentas de balance y 3. apertura del año siguiente
      const bal = ss.filter((x) => x.elemento >= 1 && x.elemento <= 5).map((s) => ({ cuenta: s.cuenta, v: sd(s) })).filter((x) => x.v !== 0);
      const cierre: Linea[] = bal.map((x) => (x.v > 0 ? { cuenta: x.cuenta, debe: 0, haber: x.v, etapa: 'OTRO' as const } : { cuenta: x.cuenta, debe: -x.v, haber: 0, etapa: 'OTRO' as const }));
      const apertura: Linea[] = bal.map((x) => (x.v > 0 ? { cuenta: x.cuenta, debe: x.v, haber: 0, etapa: 'OTRO' as const } : { cuenta: x.cuenta, debe: 0, haber: -x.v, etapa: 'OTRO' as const }));
      if (neto > 0) { cierre.push({ cuenta: C.RESULTADO_UTILIDAD, debe: neto, haber: 0, etapa: 'OTRO' }); apertura.push({ cuenta: C.UTILIDADES_ACUMULADAS, debe: 0, haber: neto, etapa: 'OTRO' }); }
      if (neto < 0) { cierre.push({ cuenta: C.RESULTADO_PERDIDA, debe: 0, haber: -neto, etapa: 'OTRO' }); apertura.push({ cuenta: '592', debe: -neto, haber: 0, etapa: 'OTRO' }); }
      if (!totales(cierre).cuadra) throw new ErrorCampo('anio', 'El cierre no cuadra: revisa el balance de comprobación del ejercicio');
      const cierreAs = await this.asientos.crear(tx, { fecha: fin, operacion: 'CIERRE', glosa: `Cierre de cuentas del ejercicio ${anio}`, lineas: cierre, usuarioId: u.id, sinDestino: true });
      const abre = await this.asientos.crear(tx, { fecha: sig, operacion: 'APERTURA', glosa: `Apertura del ejercicio ${anio + 1}`, lineas: apertura, usuarioId: u.id, sinDestino: true });

      for (let mes = 1; mes <= 12; mes++) await tx.periodo.upsert({ where: { anio_mes: { anio, mes } }, update: { cerrado: true, cerradoEn: new Date() }, create: { anio, mes, cerrado: true, cerradoEn: new Date() } });
      await this.audit.registrar(u.id, 'CIERRE_ANUAL', 'Periodo', anio, `Resultado: ${(neto / 100).toFixed(2)}`, tx as any);
      return { anio, resultado: neto / 100, regularizacion: regAs, cierre: cierreAs.id, apertura: abre.id };
    });
  }
}

@Module({ imports: [AsientosModule], controllers: [PeriodosController] })
export class PeriodosModule {}
