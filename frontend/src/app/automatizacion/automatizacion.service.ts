import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AsientoContable } from '../models/contabilidad.models';

export interface LineaPlantilla {
  codigo_cuenta: number;
  lado: 'DEBE' | 'HABER';
  variable: string;
  glosa?: string | null;
}

export interface Plantilla {
  id_plantilla: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  tipo_asiento: string;
  concepto_formato: string;
  activo: boolean;
  lineas: LineaPlantilla[];
  variables: string[];
}

export interface Recurrente {
  id_recurrente: number;
  nombre: string;
  codigo_plantilla: string;
  valores: Record<string, string | number>;
  dia_del_mes: number;
  fecha_inicio: string;
  fecha_fin?: string | null;
  activo: boolean;
  ultimo_periodo?: number | null;
}

export interface ResultadoRecurrente {
  id_recurrente: number;
  nombre: string;
  periodo: number;
  ok: boolean;
  partida?: number | null;
  error?: string | null;
}

export interface EventoOutbox {
  id_evento: number;
  tipo_evento: string;
  payload: Record<string, unknown>;
  estado: 'PENDIENTE' | 'ENVIADO' | 'FALLIDO';
  intentos: number;
  ultimo_error?: string | null;
  fecha_creacion: string;
  fecha_envio?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AutomatizacionService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8000/api/v1';

  getPlantillas(): Observable<Plantilla[]> {
    return this.http.get<Plantilla[]>(`${this.baseUrl}/plantillas`);
  }

  crearPlantilla(p: Omit<Plantilla, 'id_plantilla' | 'activo' | 'variables'>): Observable<Plantilla> {
    return this.http.post<Plantilla>(`${this.baseUrl}/plantillas`, p);
  }

  aplicarPlantilla(codigo: string, fecha: string, valores: Record<string, string>): Observable<AsientoContable> {
    return this.http.post<AsientoContable>(`${this.baseUrl}/plantillas/${codigo}/aplicar`, { fecha, valores });
  }

  getRecurrentes(): Observable<Recurrente[]> {
    return this.http.get<Recurrente[]>(`${this.baseUrl}/recurrentes`);
  }

  crearRecurrente(r: {
    nombre: string;
    codigo_plantilla: string;
    valores: Record<string, string>;
    dia_del_mes: number;
    fecha_inicio: string;
    fecha_fin?: string | null;
  }): Observable<Recurrente> {
    return this.http.post<Recurrente>(`${this.baseUrl}/recurrentes`, r);
  }

  desactivarRecurrente(id: number): Observable<Recurrente> {
    return this.http.post<Recurrente>(`${this.baseUrl}/recurrentes/${id}/desactivar`, {});
  }

  ejecutarRecurrentes(fechaCorte?: string): Observable<ResultadoRecurrente[]> {
    return this.http.post<ResultadoRecurrente[]>(`${this.baseUrl}/recurrentes/ejecutar`, {
      fecha_corte: fechaCorte || null,
    });
  }

  getEventos(estado?: string): Observable<EventoOutbox[]> {
    const q = estado ? `?estado=${estado}` : '';
    return this.http.get<EventoOutbox[]>(`${this.baseUrl}/eventos/outbox${q}`);
  }

  reintentarEvento(id: number): Observable<EventoOutbox> {
    return this.http.post<EventoOutbox>(`${this.baseUrl}/eventos/outbox/${id}/reintentar`, {});
  }
}
