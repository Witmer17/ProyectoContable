import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

export type Rol = 'ADMINISTRADOR' | 'CONTADOR' | 'AUXILIAR' | 'LECTURA';

export const ROLES_KEY = 'roles';
export const PUBLICO_KEY = 'publico';
/** Roles que pueden llamar al endpoint. El administrador siempre puede. */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
export const Publico = () => SetMetadata(PUBLICO_KEY, true);

// Grupos de roles de uso frecuente
export const SOLO_ADMIN: Rol[] = [];
export const CONTABLE: Rol[] = ['CONTADOR'];
export const REGISTRA: Rol[] = ['CONTADOR', 'AUXILIAR'];
export const TODOS: Rol[] = ['CONTADOR', 'AUXILIAR', 'LECTURA'];

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(ctx: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(PUBLICO_KEY, [ctx.getHandler(), ctx.getClass()])) return true;
    return super.canActivate(ctx);
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(PUBLICO_KEY, [ctx.getHandler(), ctx.getClass()])) return true;
    const roles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    const user = ctx.switchToHttp().getRequest().user;
    // Sin @Roles el endpoint es solo del administrador (configuración).
    if (user?.rol === 'ADMINISTRADOR' || roles?.includes(user?.rol)) return true;
    throw new ForbiddenException('Tu rol no permite esta acción');
  }
}
