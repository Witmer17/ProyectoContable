import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export const API = '/api';

/** Error del servidor, asociado al campo que lo causó cuando se conoce. */
export interface ErrorApi { campo?: string; mensaje: string; status: number }

export function errorDe(e: unknown): ErrorApi {
  if (e instanceof HttpErrorResponse) {
    const b = e.error;
    const msg = Array.isArray(b?.message) ? b.message[0] : b?.message;
    return { campo: b?.campo, mensaje: msg ?? (e.status === 0 ? 'No hay conexión con el servidor' : 'Ocurrió un error inesperado'), status: e.status };
  }
  return { mensaje: 'Ocurrió un error inesperado', status: 0 };
}

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);

  get<T>(ruta: string, params?: Record<string, string | number | undefined | null>): Observable<T> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    return this.http.get<T>(API + ruta, { params: p });
  }
  post<T>(ruta: string, cuerpo: unknown): Observable<T> { return this.http.post<T>(API + ruta, cuerpo); }
  put<T>(ruta: string, cuerpo: unknown): Observable<T> { return this.http.put<T>(API + ruta, cuerpo); }
  patch<T>(ruta: string, cuerpo: unknown): Observable<T> { return this.http.patch<T>(API + ruta, cuerpo); }

  /** Descarga un archivo (Excel, PDF, respaldo) con el token de la sesión. */
  descargar(ruta: string, params: Record<string, string | undefined>, nombre: string) {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) if (v) p = p.set(k, v);
    this.http.get(API + ruta, { params: p, responseType: 'blob' }).subscribe((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
