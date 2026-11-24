import { Body, Controller, Get, Module, Param, ParseIntPipe, Patch, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsBoolean } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { Roles, TODOS, CONTABLE } from '../common/roles';
import { ErrorCampo } from '../common/errores';

class UsuarioDto {
  @IsEmail() email: string;
  @IsString() nombre: string;
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' }) password: string;
  @IsEnum(['ADMINISTRADOR', 'CONTADOR', 'AUXILIAR', 'LECTURA']) rol: any;
}

class EditarUsuarioDto {
  @IsOptional() @IsEnum(['ADMINISTRADOR', 'CONTADOR', 'AUXILIAR', 'LECTURA']) rol?: any;
  @IsOptional() @IsBoolean() activo?: boolean;
  @IsOptional() @MinLength(8) password?: string;
}

@Controller()
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('usuarios')
  async usuarios() {
    return this.prisma.usuario.findMany({ select: { id: true, email: true, nombre: true, rol: true, activo: true, creadoEn: true }, orderBy: { id: 'asc' } });
  }

  @Post('usuarios')
  async crear(@Body() dto: UsuarioDto) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.usuario.findUnique({ where: { email } })) throw new ErrorCampo('email', 'Ya existe un usuario con ese correo');
    const u = await this.prisma.usuario.create({ data: { email, nombre: dto.nombre, rol: dto.rol, passwordHash: await bcrypt.hash(dto.password, 10) } });
    return { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, activo: u.activo };
  }

  @Patch('usuarios/:id')
  async editar(@Param('id', ParseIntPipe) id: number, @Body() dto: EditarUsuarioDto) {
    const data: any = { rol: dto.rol, activo: dto.activo };
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    const u = await this.prisma.usuario.update({ where: { id }, data });
    return { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, activo: u.activo };
  }

  /** Quién creó, modificó o anuló cada asiento y cuándo. */
  @Get('auditoria') @Roles(...CONTABLE)
  async auditoria(@Query('entidad') entidad?: string, @Query('limite') limite = '200') {
    return this.prisma.auditoria.findMany({ where: entidad ? { entidad } : {}, include: { usuario: { select: { nombre: true, email: true } } }, orderBy: { id: 'desc' }, take: Math.min(Number(limite) || 200, 1000) });
  }

  /** Respaldo: exportación completa de la base de datos a un archivo JSON. */
  @Get('respaldo')
  async respaldo(@Res() res: Response) {
    const p = this.prisma;
    const datos = {
      generado: new Date().toISOString(),
      empresa: await p.empresa.findMany(), cuentas: await p.cuenta.findMany(), terceros: await p.tercero.findMany(), productos: await p.producto.findMany(),
      kardex: await p.kardexMov.findMany(), activos: await p.activoFijo.findMany(), documentos: await p.documento.findMany(), pagos: await p.pago.findMany(),
      asientos: await p.asiento.findMany(), lineas: await p.asientoLinea.findMany(), periodos: await p.periodo.findMany(), tiposCambio: await p.tipoCambio.findMany(),
      auditoria: await p.auditoria.findMany(),
      usuarios: (await p.usuario.findMany()).map(({ passwordHash, ...u }) => u),
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="respaldo-${new Date().toISOString().slice(0, 10)}.json"`);
    res.send(JSON.stringify(datos, null, 1));
  }
}

@Module({ controllers: [AdminController] })
export class AdminModule {}
