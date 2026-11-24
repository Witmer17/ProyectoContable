import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UsuarioJwt { id: number; email: string; rol: 'ADMINISTRADOR' | 'CONTADOR' | 'AUXILIAR' | 'LECTURA' }

export const Usuario = createParamDecorator((_: unknown, ctx: ExecutionContext): UsuarioJwt => ctx.switchToHttp().getRequest().user);
