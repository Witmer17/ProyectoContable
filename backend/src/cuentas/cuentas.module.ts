import { Body, Controller, Get, Module, NotFoundException, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { Roles, TODOS, REGISTRA } from '../common/roles';
import { ErrorCampo } from '../common/errores';
import { EmpresaModule, EmpresaService } from '../empresa/empresa.module';
import { modulosDe } from '../empresa/perfiles';
import { nivelDe } from './catalogo';

class CuentaDto {
  @Matches(/^\d{2,8}$/, { message: 'El código debe ser numérico (2 a 8 dígitos)' }) codigo: string;
  @IsString() nombre: string;
  @IsEnum(['DEUDORA', 'ACREEDORA']) naturaleza: string;
  @IsOptional() @IsBoolean() requiereDestino?: boolean;
  @IsOptional() @IsString() destinoDefecto?: string;
}

class EditarCuentaDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsBoolean() requiereDestino?: boolean;
  @IsOptional() @IsString() destinoDefecto?: string;
  @IsOptional() @IsBoolean() activa?: boolean;
}

@Controller('cuentas')
export class CuentasController {
  constructor(private prisma: PrismaService, private empresa: EmpresaService) {}

  /**
   * Cuentas visibles para el perfil de la empresa, de último nivel y activas.
   * `grupo` filtra por prefijo (p. ej. 63 para servicios); las más usadas van primero.
   */
  @Get() @Roles(...TODOS)
  async listar(@Query('grupo') grupo?: string, @Query('q') q?: string, @Query('todas') todas?: string) {
    const e = await this.empresa.obtener();
    const m = e ? modulosDe(e) : null;
    const cuentas = await this.prisma.cuenta.findMany({
      where: { ...(todas === 'true' ? {} : { activa: true, ultimoNivel: true }), ...(grupo ? { codigo: { startsWith: grupo } } : {}), ...(q ? { OR: [{ codigo: { startsWith: q } }, { nombre: { contains: q, mode: 'insensitive' } }] } : {}) },
      orderBy: [{ uso: 'desc' }, { codigo: 'asc' }],
    });
    if (todas === 'true' || !e || !m) return cuentas;
    const mod: Record<string, boolean> = { PLANILLA: m.planilla, ACTIVOS: m.activos, DOLARES: m.dolares, HONORARIOS: m.honorarios };
    return cuentas.filter((c) => (!c.perfiles.length || c.perfiles.includes(e.actividad)) && (!c.modulo || mod[c.modulo]));
  }

  /** Búsqueda exacta por código, para el selector código<->nombre. */
  @Get(':codigo') @Roles(...TODOS)
  async una(@Param('codigo') codigo: string) {
    const c = await this.prisma.cuenta.findUnique({ where: { codigo } });
    if (!c) throw new NotFoundException('Esta cuenta no existe');
    return c;
  }

  @Post()
  async crear(@Body() dto: CuentaDto) {
    if (await this.prisma.cuenta.findUnique({ where: { codigo: dto.codigo } })) throw new ErrorCampo('codigo', 'Esta cuenta ya existe');
    return this.prisma.cuenta.create({
      data: { codigo: dto.codigo, nombre: dto.nombre, elemento: Number(dto.codigo[0]), naturaleza: dto.naturaleza, nivel: nivelDe(dto.codigo), requiereDestino: dto.requiereDestino ?? /^6[2-8]/.test(dto.codigo), destinoDefecto: dto.destinoDefecto, perfiles: [] },
    });
  }

  @Patch(':codigo')
  async editar(@Param('codigo') codigo: string, @Body() dto: EditarCuentaDto) {
    if (!(await this.prisma.cuenta.findUnique({ where: { codigo } }))) throw new NotFoundException('Esta cuenta no existe');
    return this.prisma.cuenta.update({ where: { codigo }, data: dto });
  }
}

@Module({ imports: [EmpresaModule], controllers: [CuentasController] })
export class CuentasModule {}
