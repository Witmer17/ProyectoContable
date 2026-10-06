import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface Sesion {
  access_token: string;
  rol: string;
  nombre_usuario: string;
}

const CLAVE = 'sc_sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8000/api/v1';

  sesion = signal<Sesion | null>(this.leer());
  logueado = computed(() => this.sesion() !== null);
  puedeEscribir = computed(() => ['ADMIN', 'JEFE_CONTABILIDAD', 'CONTADOR'].includes(this.sesion()?.rol ?? ''));
  puedeCerrarPeriodos = computed(() => ['ADMIN', 'JEFE_CONTABILIDAD'].includes(this.sesion()?.rol ?? ''));

  get token(): string | null {
    return this.sesion()?.access_token ?? null;
  }

  login(username: string, password: string): Observable<Sesion> {
    const body = new URLSearchParams({ username, password });
    return this.http
      .post<Sesion>(`${this.baseUrl}/auth/login`, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(
        tap((s) => {
          this.sesion.set(s);
          try { localStorage.setItem(CLAVE, JSON.stringify(s)); } catch {}
        }),
      );
  }

  logout() {
    this.sesion.set(null);
    try { localStorage.removeItem(CLAVE); } catch {}
  }

  private leer(): Sesion | null {
    try {
      const raw = localStorage.getItem(CLAVE);
      return raw ? (JSON.parse(raw) as Sesion) : null;
    } catch {
      return null;
    }
  }
}
