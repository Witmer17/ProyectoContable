import { Body, Controller, Get, Injectable, Module, Param, Post, Put, Query } from '@nestjs/common';
import { Actividad } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Matches, Min, Max } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { Roles, TODOS } from '../common/roles';
import { Usuario, UsuarioJwt } from '../common/usuario.decorator';
import { ErrorCampo, fechaDate } from '../common/errores';
import { validarDocumento } from '../common/validaciones';
import { AuditoriaService } from '../asientos/auditoria.service';
import { modulosDe, PERFILES } from './perfiles';

class PerfilDto {
  @IsOptional() @IsString() perfil?: string;
  @IsEnum(['COMERCIAL', 'SERVICIOS', 'INDUSTRIAL', 'MIXTA']) actividad: Actividad;
  @IsBoolean() tienePlanilla: boolean;
  @IsBoolean() tieneActivos: boolean;
  @IsBoolean() usaDolares: boolean;
  @IsBoolean() recibeHonorarios: boolean;
}

class DatosEmpresaDto {
  @Matches(/^\d{11}$/, { message: 'El RUC debe tener 11 dígitos' }) ruc: string;
  @IsString() razonSocial: string;
  @IsOptional() @IsNumber() @Min(0) @Max(0.3) igvTasa?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(0.3) retencionTasa?: number;
  @IsOptional() @IsEnum(['PROMEDIO', 'PEPS']) metodoKardex?: string;
}

class TipoCambioDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha: string;
  @IsNumber() @Min(0.01) valor: number;
}

@Injectable()
export class EmpresaService {
  constructor(private prisma: PrismaService) {}

  async obtener() {
    const e = await this.prisma.empresa.findUnique({ where: { id: 1 } });
    if (!e) return null;
    return { ...e, igvTasa: Number(e.igvTasa), retencionTasa: Number(e.retencionTasa) };
  }

  async obtenerOError() {
    const e = await this.obtener();
    if (!e) throw new ErrorCampo('empresa', 'Falta configurar el perfil de la empresa');
    return e;
  }
}

@Controller('empresa')
export class EmpresaController {
  constructor(private svc: EmpresaService, private prisma: PrismaService, private audit: AuditoriaService) {}

  @Get() @Roles(...TODOS)
  async get() {
    const e = await this.svc.obtener();
    return e ? { ...e, modulos: modulosDe(e) } : null;
  }

  @Get('perfiles') @Roles(...TODOS)
  perfiles() {
    return Object.entries(PERFILES).map(([id, p]) => ({ id, nombre: p.nombre, descripcion: p.descripcion, respuestas: p.respuestas }));
  }

  /** Perfil (seis preguntas). Solo administrador. Avisa si ya hay registros que dependen de lo que se apaga. */
  @Put('perfil')
  async perfil(@Body() dto: PerfilDto, @Usuario() u: UsuarioJwt) {
    const actual = await this.svc.obtener();
    const avisos: string[] = [];
    if (actual?.configurada) {
      const cambios: [boolean, boolean, string, () => Promise<number>][] = [
        [actual.tienePlanilla, dto.tienePlanilla, 'planilla', () => this.prisma.asiento.count({ where: { operacion: 'PLANILLA' } })],
        [actual.tieneActivos, dto.tieneActivos, 'activos fijos', () => this.prisma.activoFijo.count()],
        [actual.recibeHonorarios, dto.recibeHonorarios, 'honorarios', () => this.prisma.documento.count({ where: { tipo: 'RH' } })],
      ];
      for (const [antes, ahora, nombre, contar] of cambios) {
        if (antes && !ahora) {
          const n = await contar();
          if (n) avisos.push(`Se ocultó ${nombre}, pero ya existen ${n} registro(s) afectados; seguirán visibles en los reportes.`);
        }
      }
    }
    const data = { actividad: dto.actividad, tienePlanilla: dto.tienePlanilla, tieneActivos: dto.tieneActivos, usaDolares: dto.usaDolares, recibeHonorarios: dto.recibeHonorarios, perfil: dto.perfil ?? 'PERSONALIZADO', configurada: true };
    const e = await this.prisma.empresa.upsert({ where: { id: 1 }, update: data, create: { id: 1, ruc: '20000000001', razonSocial: 'EMPRESA SIN NOMBRE', ...data } });
    await this.audit.registrar(u.id, 'PERFIL', 'Empresa', 1, JSON.stringify(data));
    return { empresa: { ...e, igvTasa: Number(e.igvTasa), retencionTasa: Number(e.retencionTasa), modulos: modulosDe(e) }, avisos };
  }

  @Put('datos')
  async datos(@Body() dto: DatosEmpresaDto, @Usuario() u: UsuarioJwt) {
    const err = validarDocumento('RUC', dto.ruc);
    if (err) throw new ErrorCampo('ruc', err);
    const data = { ruc: dto.ruc, razonSocial: dto.razonSocial, igvTasa: dto.igvTasa, retencionTasa: dto.retencionTasa, metodoKardex: dto.metodoKardex };
    const e = await this.prisma.empresa.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    await this.audit.registrar(u.id, 'DATOS', 'Empresa', 1, JSON.stringify(data));
    return { ...e, igvTasa: Number(e.igvTasa), retencionTasa: Number(e.retencionTasa) };
  }

  @Get('tipo-cambio') @Roles(...TODOS)
  async tc(@Query('fecha') fecha?: string) {
    if (!fecha) return (await this.prisma.tipoCambio.findMany({ orderBy: { fecha: 'desc' }, take: 60 })).map((t) => ({ fecha: t.fecha.toISOString().slice(0, 10), valor: Number(t.valor) }));
    const t = await this.prisma.tipoCambio.findFirst({ where: { fecha: { lte: fechaDate(fecha) } }, orderBy: { fecha: 'desc' } });
    return t ? { fecha: t.fecha.toISOString().slice(0, 10), valor: Number(t.valor) } : null;
  }

  @Post('tipo-cambio')
  async setTc(@Body() dto: TipoCambioDto) {
    const t = await this.prisma.tipoCambio.upsert({ where: { fecha: fechaDate(dto.fecha) }, update: { valor: dto.valor }, create: { fecha: fechaDate(dto.fecha), valor: dto.valor } });
    return { fecha: dto.fecha, valor: Number(t.valor) };
  }
}

@Module({ controllers: [EmpresaController], providers: [EmpresaService, AuditoriaService], exports: [EmpresaService, AuditoriaService] })
export class EmpresaModule {}
