import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { of } from 'rxjs';

export type Rol = 'ADMINISTRADOR' | 'CONTADOR' | 'AUXILIAR' | 'LECTURA';
export interface Usuario { id: number; nombre: string; email: string; rol: Rol }

const USUARIO_DEFECTO: Usuario = {
  id: 1,
  nombre: 'Administrador',
  email: 'admin@demo.pe',
  rol: 'ADMINISTRADOR',
};

// Token activo de sesión directa
const TOKEN_DIRECTO = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIxIiwidXNlcklkIjoxLCJlbWFpbCI6ImFkbWluQGRlbW8ucGUiLCJyb2wiOiJBRE1JTklTVFJBRE9SIiwiaWF0IjoxNzk1NjI4MjAxLCJleHAiOjE3OTYyMzMwMDF9.fXu2Ybq20xYemcRnxKpghUy2aHZYYxft4QUj0RLJR_hIorlDVC9KBKvG5ZNENhr7ozmAwfCJwfbTqaTRzB2utw';

@Injectable({ providedIn: 'root' })
export class Auth {
  readonly usuario = signal<Usuario | null>(USUARIO_DEFECTO);
  token: string | null = TOKEN_DIRECTO;
  readonly rol = computed(() => 'ADMINISTRADOR');
  readonly esAdmin = computed(() => true);
  readonly contable = computed(() => true);
  readonly registra = computed(() => true);

  constructor() {
    this.usuario.set(USUARIO_DEFECTO);
  }

  login(email?: string, password?: string) {
    return of({ token: TOKEN_DIRECTO, usuario: USUARIO_DEFECTO });
  }

  logout() {
    // Sin login: permanece en el sistema como Administrador
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const token = auth.token || TOKEN_DIRECTO;
  const r = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(r);
};
