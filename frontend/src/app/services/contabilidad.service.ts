import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AsientoContable,
  CrearAsientoPayload,
  RectificarAsientoPayload,
  CuentaPCGE,
  PeriodoFiscal,
  KPIsContables,
  BalanceComprobacionItem,
  FacturaVentaPayload,
} from '../models/contabilidad.models';

@Injectable({
  providedIn: 'root',
})
export class ContabilidadService {
  private http = inject(HttpClient);
  // URL base para la API REST FastAPI
  private baseUrl = 'http://localhost:8000/api/v1';

  getKPIs(ejercicio: number = 2026): Observable<KPIsContables> {
    return this.http.get<KPIsContables>(`${this.baseUrl}/reportes/kpis?ejercicio=${ejercicio}`);
  }

  getAsientos(ejercicio?: number, estado?: string): Observable<AsientoContable[]> {
    let params = new HttpParams();
    if (ejercicio) params = params.set('codigo_ejercicio', ejercicio.toString());
    if (estado) params = params.set('estado', estado);
    return this.http.get<AsientoContable[]>(`${this.baseUrl}/asientos`, { params });
  }

  getAsiento(partida: number): Observable<AsientoContable> {
    return this.http.get<AsientoContable>(`${this.baseUrl}/asientos/${partida}`);
  }

  crearAsiento(payload: CrearAsientoPayload): Observable<AsientoContable> {
    return this.http.post<AsientoContable>(`${this.baseUrl}/asientos`, payload);
  }

  rectificarAsiento(partida: number, payload: RectificarAsientoPayload): Observable<AsientoContable> {
    return this.http.post<AsientoContable>(`${this.baseUrl}/asientos/${partida}/rectificar`, payload);
  }

  getCuentas(): Observable<CuentaPCGE[]> {
    return this.http.get<CuentaPCGE[]>(`${this.baseUrl}/cuentas`);
  }

  getPeriodos(ejercicio: number = 2026): Observable<PeriodoFiscal[]> {
    return this.http.get<PeriodoFiscal[]>(`${this.baseUrl}/periodos?codigo_ejercicio=${ejercicio}`);
  }

  bloquearPeriodo(payload: {
    codigo_ejercicio: number;
    mes: number;
    estado_bloqueo: string;
    razon_bloqueo?: string;
    usuario?: string;
  }): Observable<PeriodoFiscal> {
    return this.http.post<PeriodoFiscal>(`${this.baseUrl}/periodos/bloquear`, payload);
  }

  emitirYContabilizarFactura(payload: FacturaVentaPayload): Observable<AsientoContable> {
    return this.http.post<AsientoContable>(`${this.baseUrl}/facturas/emitir-y-contabilizar`, payload);
  }

  getBalanceComprobacion(ejercicio: number = 2026): Observable<BalanceComprobacionItem[]> {
    return this.http.get<BalanceComprobacionItem[]>(`${this.baseUrl}/reportes/balance-comprobacion?ejercicio=${ejercicio}`);
  }

  descargarPLEDiario(ejercicio: number = 2026, mes: number = 10, ruc: string = '20123456789'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/reportes/ple/diario?ejercicio=${ejercicio}&mes=${mes}&ruc=${ruc}`, {
      responseType: 'blob',
    });
  }
}
