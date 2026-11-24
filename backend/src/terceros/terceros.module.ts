import { Body, Controller, Get, Module, NotFoundException, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { TipoTercero } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { REGISTRA, Roles, TODOS } from '../common/roles';
import { ErrorCampo } from '../common/errores';
import { validarDocumento } from '../common/validaciones';

class TerceroDto {
  @IsEnum(['CLIENTE', 'PROVEEDOR', 'SOCIO', 'TRABAJADOR']) tipo: TipoTercero;
  @IsEnum(['RUC', 'DNI']) tipoDoc: string;
  @IsString() documento: string;
  @IsString() nombre: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsNumber() sueldo?: number;
  @IsOptional() @IsEnum(['ONP', 'AFP']) pension?: string;
}

@Controller('terceros')
export class TercerosController {
  constructor(private prisma: PrismaService) {}

  @Get() @Roles(...TODOS)
  listar(@Query('tipo') tipo?: TipoTercero, @Query('q') q?: string) {
    return this.prisma.tercero.findMany({
      where: { activo: true, ...(tipo ? { tipo } : {}), ...(q ? { OR: [{ nombre: { contains: q, mode: 'insensitive' } }, { documento: { startsWith: q } }] } : {}) },
      orderBy: { nombre: 'asc' },
    });
  }

  /** Creación rápida desde cualquier pantalla (botón "+ Nuevo"). */
  @Post() @Roles(...REGISTRA)
  async crear(@Body() dto: TerceroDto) {
    const err = validarDocumento(dto.tipoDoc, dto.documento);
    if (err) throw new ErrorCampo('documento', err);
    const dup = await this.prisma.tercero.findUnique({ where: { tipo_documento: { tipo: dto.tipo, documento: dto.documento } } });
    if (dup) throw new ErrorCampo('documento', `Ya existe ${dup.nombre} con ese documento`);
    return this.prisma.tercero.create({ data: { ...dto, sueldo: dto.sueldo } });
  }

  @Patch(':id') @Roles(...REGISTRA)
  async editar(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<TerceroDto>) {
    if (!(await this.prisma.tercero.findUnique({ where: { id } }))) throw new NotFoundException();
    if (dto.documento) {
      const err = validarDocumento(dto.tipoDoc ?? 'RUC', dto.documento);
      if (err) throw new ErrorCampo('documento', err);
    }
    return this.prisma.tercero.update({ where: { id }, data: dto });
  }
}

@Module({ controllers: [TercerosController] })
export class TercerosModule {}
