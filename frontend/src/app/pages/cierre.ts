import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Api, errorDe } from '../core/api';
import { Auth } from '../core/auth';

interface Mes { anio: number; mes: number; cerrado: boolean; motivo?: string }
const NOMBRES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];

@Component({
  imports: [FormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <div class="pagina">
      <h1>Cierre de periodos</h1>
      <p class="muted">Cerrar un mes bloquea cualquier asiento de ese mes. Para confirmar se pide tu clave.</p>
      <div class="fila" style="align-items:center">
        <mat-form-field class="angosto"><mat-label>Año</mat-label><input matInput type="number" [(ngModel)]="anio" (change)="cargar()" /></mat-form-field>
        <mat-form-field><mat-label>Tu clave (confirmación)</mat-label><input matInput type="password" [(ngModel)]="clave" autocomplete="current-password" /></mat-form-field>
        @if (auth.esAdmin()) { <mat-form-field><mat-label>Motivo (solo para reabrir)</mat-label><input matInput [(ngModel)]="motivo" /></mat-form-field> }
      </div>
      @if (error()) { <p class="falta" role="alert">{{ error() }}</p> }
      @if (ok()) { <p class="nota" role="status">{{ ok() }}</p> }
      <div class="tarjetas">
        @for (m of meses(); track m.mes) {
          <mat-card style="padding:12px">
            <strong>{{ nombres[m.mes] }}</strong>
            <div><mat-icon style="vertical-align:middle">{{ m.cerrado ? 'lock' : 'lock_open' }}</mat-icon> {{ m.cerrado ? 'Cerrado' : 'Abierto' }}</div>
            @if (m.cerrado) { @if (auth.esAdmin()) { <button mat-button type="button" (click)="reabrir(m)">Reabrir</button> } }
            @else { <button mat-stroked-button type="button" (click)="cerrar(m)">Cerrar mes</button> }
          </mat-card>
        }
      </div>
      <mat-card style="padding:16px;margin-top:16px">
        <h2>Cierre anual {{ anio }}</h2>
        <p class="muted">Regulariza los resultados (cuentas 6, 7 y 9 contra 891/892), cierra las cuentas de balance, genera la apertura del año siguiente (el resultado pasa a 591/592) y bloquea los 12 meses. No se puede deshacer sin reabrir cada mes.</p>
        <button mat-flat-button color="warn" type="button" (click)="cierreAnual()">Ejecutar cierre anual</button>
      </mat-card>
    </div>
  `,
})
export class Cierre implements OnInit {
  private api = inject(Api);
  auth = inject(Auth);
  nombres = NOMBRES;
  anio = new Date().getFullYear();
  clave = '';
  motivo = '';
  meses = signal<Mes[]>([]);
  error = signal('');
  ok = signal('');

  ngOnInit() { this.cargar(); }
  cargar() { this.api.get<Mes[]>('/periodos', { anio: this.anio }).subscribe((m) => this.meses.set(m)); }

  private ejecutar(ruta: string, cuerpo: Record<string, unknown>, mensaje: string) {
    this.error.set(''); this.ok.set('');
    this.api.post(ruta, { password: this.clave, ...cuerpo }).subscribe({ next: () => { this.ok.set(mensaje); this.clave = ''; this.cargar(); }, error: (e) => this.error.set(errorDe(e).mensaje) });
  }
  cerrar(m: Mes) { this.ejecutar(`/periodos/${m.anio}/${m.mes}/cerrar`, {}, `${NOMBRES[m.mes]} cerrado`); }
  reabrir(m: Mes) { this.ejecutar(`/periodos/${m.anio}/${m.mes}/reabrir`, { motivo: this.motivo }, `${NOMBRES[m.mes]} reabierto`); }
  cierreAnual() { this.ejecutar(`/periodos/cierre-anual/${this.anio}`, {}, `Ejercicio ${this.anio} cerrado y ejercicio ${this.anio + 1} abierto`); }
}
