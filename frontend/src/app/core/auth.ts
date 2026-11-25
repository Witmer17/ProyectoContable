import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { of } from 'rxjs';

export type Rol = 'ADMINISTRADOR' | 'CONTADOR' | 'AUXILIAR' | 'LECTURA';
export interface Usuario { id: number; nombre: string; email: string; rol: Rol }

const USUARIO_DEFECTO: Usuario = {
  id: 1,
  nombre: 'Administrador',
  email: 'admin@demo.pe',
  rol: 'ADMINISTRADOR',
};

@Injectable({ providedIn: 'root' })
export class Auth {
  readonly usuario = signal<Usuario | null>(USUARIO_DEFECTO);
  token: string | null = 'sin-login';
  readonly rol = computed(() => 'ADMINISTRADOR');
  readonly esAdmin = computed(() => true);
  readonly contable = computed(() => true);
  readonly registra = computed(() => true);

  constructor() {
    this.usuario.set(USUARIO_DEFECTO);
  }

  login(email?: string, password?: string) {
    return of({ token: 'sin-login', usuario: USUARIO_DEFECTO });
  }

  logout() {
    // Modo sin login activo
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
