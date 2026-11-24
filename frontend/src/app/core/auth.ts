import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { Api } from './api';

export type Rol = 'ADMINISTRADOR' | 'CONTADOR' | 'AUXILIAR' | 'LECTURA';
export interface Usuario { id: number; nombre: string; email: string; rol: Rol }

const CLAVE = 'sc_sesion';

@Injectable({ providedIn: 'root' })
export class Auth {
  private api = inject(Api);
  private router = inject(Router);
  readonly usuario = signal<Usuario | null>(null);
  token: string | null = null;
  readonly rol = computed(() => this.usuario()?.rol);
  readonly esAdmin = computed(() => this.rol() === 'ADMINISTRADOR');
  readonly contable = computed(() => this.rol() === 'ADMINISTRADOR' || this.rol() === 'CONTADOR');
  readonly registra = computed(() => this.contable() || this.rol() === 'AUXILIAR');

  constructor() {
    try {
      const s = JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null');
      if (s) { this.token = s.token; this.usuario.set(s.usuario); }
    } catch { /* sin sesión previa */ }
  }

  login(email: string, password: string) {
    return this.api.post<{ token: string; usuario: Usuario }>('/auth/login', { email, password }).pipe(
      tap((r) => {
        this.token = r.token;
        this.usuario.set(r.usuario);
        try { sessionStorage.setItem(CLAVE, JSON.stringify(r)); } catch { /* almacenamiento no disponible */ }
      }),
    );
  }

  logout() {
    this.token = null;
    this.usuario.set(null);
    try { sessionStorage.removeItem(CLAVE); } catch { /* ignorar */ }
    this.router.navigate(['/login']);
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const r = auth.token ? req.clone({ setHeaders: { Authorization: `Bearer ${auth.token}` } }) : req;
  return next(r).pipe(tap({ error: (e) => { if (e.status === 401 && !req.url.endsWith('/auth/login') && !req.url.includes('/periodos/')) auth.logout(); } }));
};
