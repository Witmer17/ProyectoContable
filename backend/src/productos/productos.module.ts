import { Body, Controller, Get, Module, Param, ParseIntPipe, Post } from '@nestjs/common';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { REGISTRA, Roles, TODOS } from '../common/roles';
import { ErrorCampo } from '../common/errores';

class ProductoDto {
  @IsString() codigo: string;
  @IsString() nombre: string;
  @IsOptional() @IsString() unidad?: string;
  @IsOptional() @IsEnum(['MERCADERIA', 'MATERIA_PRIMA', 'PRODUCTO_TERMINADO']) tipo?: string;
}

const num = (v: unknown) => Number(v);

@Controller('productos')
export class ProductosController {
  constructor(private prisma: PrismaService) {}

  @Get() @Roles(...TODOS)
  async listar() {
    const ps = await this.prisma.producto.findMany({ orderBy: { codigo: 'asc' } });
    return ps.map((p) => ({ ...p, stock: num(p.stock), costoPromedio: num(p.costoPromedio) }));
  }

  @Post() @Roles(...REGISTRA)
  async crear(@Body() dto: ProductoDto) {
    if (await this.prisma.producto.findUnique({ where: { codigo: dto.codigo } })) throw new ErrorCampo('codigo', 'Ya existe un producto con ese código');
    const p = await this.prisma.producto.create({ data: dto });
    return { ...p, stock: 0, costoPromedio: 0 };
  }

  @Get(':id/kardex') @Roles(...TODOS)
  async kardex(@Param('id', ParseIntPipe) id: number) {
    const [p, movs] = await Promise.all([
      this.prisma.producto.findUniqueOrThrow({ where: { id } }),
      this.prisma.kardexMov.findMany({ where: { productoId: id }, orderBy: [{ fecha: 'asc' }, { id: 'asc' }] }),
    ]);
    return {
      producto: { ...p, stock: num(p.stock), costoPromedio: num(p.costoPromedio) },
      movimientos: movs.map((m) => ({ fecha: m.fecha.toISOString().slice(0, 10), tipo: m.tipo, cantidad: num(m.cantidad), costoUnit: num(m.costoUnit), costoTotal: num(m.costoTotal), saldoCant: num(m.saldoCant), saldoCosto: num(m.saldoCosto) })),
    };
  }
}

@Module({ controllers: [ProductosController] })
export class ProductosModule {}
