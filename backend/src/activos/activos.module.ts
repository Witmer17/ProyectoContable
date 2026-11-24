import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import { IsInt, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { REGISTRA, Roles, TODOS } from '../common/roles';
import { fechaDate } from '../common/errores';
import { TASA_DEPRECIACION_DEFECTO } from '../motor-asientos';

class ActivoDto {
  @IsString() nombre: string;
  @IsString() cuenta: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) fechaCompra: string;
  @IsNumber() @Min(0.01) valor: number;
  @IsOptional() @IsInt() @Min(1) vidaUtilMeses?: number;
  @IsOptional() @IsNumber() tasaAnual?: number;
}

@Controller('activos')
export class ActivosController {
  constructor(private prisma: PrismaService) {}

  @Get() @Roles(...TODOS)
  async listar() {
    const as = await this.prisma.activoFijo.findMany({ orderBy: { id: 'asc' } });
    return as.map((a) => ({ ...a, valor: Number(a.valor), depreciado: Number(a.depreciado), tasaAnual: Number(a.tasaAnual), fechaCompra: a.fechaCompra.toISOString().slice(0, 10) }));
  }

  /** Alta de un bien ya existente (los bienes comprados desde el asistente se dan de alta solos). */
  @Post() @Roles(...REGISTRA)
  async alta(@Body() dto: ActivoDto) {
    const tasa = dto.tasaAnual ?? TASA_DEPRECIACION_DEFECTO[dto.cuenta] ?? 0.1;
    return this.prisma.activoFijo.create({ data: { nombre: dto.nombre, cuenta: dto.cuenta, fechaCompra: fechaDate(dto.fechaCompra), valor: dto.valor, tasaAnual: tasa, vidaUtilMeses: dto.vidaUtilMeses ?? Math.round(12 / tasa) } });
  }
}

@Module({ controllers: [ActivosController] })
export class ActivosModule {}
