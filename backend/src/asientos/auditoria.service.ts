import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditoriaService {
  constructor(private prisma: PrismaService) {}

  registrar(usuarioId: number | undefined, accion: string, entidad: string, entidadId?: string | number, detalle?: string, tx: Pick<PrismaService, 'auditoria'> = this.prisma) {
    return tx.auditoria.create({ data: { usuarioId, accion, entidad, entidadId: entidadId?.toString(), detalle } });
  }
}
