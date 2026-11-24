import { Body, Controller, Get, Module, NotFoundException, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { IsArray, IsNumber, IsOptional, IsString, Matches, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { CONTABLE, REGISTRA, Roles, TODOS } from '../common/roles';
import { Usuario, UsuarioJwt } from '../common/usuario.decorator';
import { fechaDate } from '../common/errores';
import { AsientosService } from './asientos.service';
import { AuditoriaService } from './auditoria.service';

class AnularDto {
  @IsString() motivo: string;
}

export const mapAsiento = (a: any) => ({
  id: a.id, numero: a.numero, fecha: a.fecha.toISOString().slice(0, 10), periodo: a.periodo, operacion: a.operacion, glosa: a.glosa, estado: a.estado,
  motivoAnulacion: a.motivoAnulacion, reversionId: a.reversionId, revierteA: a.revierteA, creadoEn: a.creadoEn, usuario: a.usuario?.nombre,
  lineas: (a.lineas ?? []).map((l: any) => ({ orden: l.orden, cuenta: l.cuentaCodigo, nombre: l.cuenta?.nombre, debe: Number(l.debe), haber: Number(l.haber), etapa: l.etapa, tercero: l.tercero?.nombre })),
});

@Controller('asientos')
export class AsientosController {
  constructor(private prisma: PrismaService, private svc: AsientosService) {}

  @Get() @Roles(...TODOS)
  async listar(@Query('desde') desde?: string, @Query('hasta') hasta?: string, @Query('operacion') operacion?: string, @Query('estado') estado?: string) {
    const as = await this.prisma.asiento.findMany({
      where: { ...(desde || hasta ? { fecha: { ...(desde ? { gte: fechaDate(desde) } : {}), ...(hasta ? { lte: fechaDate(hasta) } : {}) } } : {}), ...(operacion ? { operacion } : {}), ...(estado ? { estado: estado as any } : {}) },
      include: { lineas: { orderBy: { orden: 'asc' }, include: { cuenta: true, tercero: true } }, usuario: true },
      orderBy: [{ fecha: 'desc' }, { numero: 'desc' }],
      take: 500,
    });
    return as.map(mapAsiento);
  }

  @Get(':id') @Roles(...TODOS)
  async uno(@Param('id', ParseIntPipe) id: number) {
    const a = await this.prisma.asiento.findUnique({ where: { id }, include: { lineas: { orderBy: { orden: 'asc' }, include: { cuenta: true, tercero: true } }, usuario: true } });
    if (!a) throw new NotFoundException('Asiento no encontrado');
    return mapAsiento(a);
  }

  @Post(':id/anular') @Roles(...CONTABLE)
  anular(@Param('id', ParseIntPipe) id: number, @Body() dto: AnularDto, @Usuario() u: UsuarioJwt) {
    return this.svc.anular(id, dto.motivo, u);
  }
}

@Module({ controllers: [AsientosController], providers: [AsientosService, AuditoriaService], exports: [AsientosService, AuditoriaService] })
export class AsientosModule {}
