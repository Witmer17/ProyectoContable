import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Api, errorDe } from '../core/api';
import { Auth } from '../core/auth';
import { soles } from '../core/util';
import { LineaVista, TablaAsiento } from '../shared/tabla-asiento';

interface AsientoVista { id: number; numero: number; fecha: string; operacion: string; glosa: string; estado: string; motivoAnulacion?: string; usuario?: string; lineas: LineaVista[] }

@Component({
  imports: [FormsModule, MatExpansionModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, TablaAsiento],
  template: `
    <div class="pagina">
      <h1>Diario de asientos</h1>
      <div class="fila">
        <mat-form-field><mat-label>Desde</mat-label><input matInput type="date" [(ngModel)]="desde" (change)="cargar()" /></mat-form-field>
        <mat-form-field><mat-label>Hasta</mat-label><input matInput type="date" [(ngModel)]="hasta" (change)="cargar()" /></mat-form-field>
        <mat-form-field><mat-label>Tipo de operación</mat-label>
          <mat-select [(ngModel)]="operacion" (selectionChange)="cargar()">
            <mat-option value="">Todas</mat-option>
            @for (o of operaciones; track o) { <mat-option [value]="o">{{ o }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>
      <mat-accordion>
        @for (a of asientos(); track a.id) {
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>N.º {{ a.numero }} · {{ a.fecha }}</mat-panel-title>
              <mat-panel-description>{{ a.glosa }} @if (a.estado === 'ANULADO') { <strong style="color:#b91c1c"> · ANULADO</strong> }</mat-panel-description>
            </mat-expansion-panel-header>
            <p class="muted">{{ a.operacion }} · registrado por {{ a.usuario ?? '—' }}@if (a.motivoAnulacion) { · Motivo de anulación: {{ a.motivoAnulacion }} }</p>
            <app-tabla-asiento [lineas]="a.lineas" [debe]="total(a, 'debe')" [haber]="total(a, 'haber')" [cuadra]="total(a, 'debe') === total(a, 'haber')" />
            @if (auth.contable() && a.estado === 'ACTIVO' && a.operacion !== 'REVERSION') {
              <div class="fila" style="align-items:center">
                <mat-form-field><mat-label>Motivo de la anulación</mat-label><input matInput [ngModel]="motivos[a.id] ?? ''" (ngModelChange)="motivos[a.id] = $event" /></mat-form-field>
                <button mat-stroked-button color="warn" type="button" (click)="anular(a)">Anular con asiento de reversión</button>
              </div>
              @if (errores()[a.id]) { <div class="falta" role="alert">{{ errores()[a.id] }}</div> }
            }
          </mat-expansion-panel>
        } @empty { <p class="muted">No hay asientos en este rango.</p> }
      </mat-accordion>
    </div>
  `,
})
export class Asientos implements OnInit {
  private api = inject(Api);
  auth = inject(Auth);
  soles = soles;
  desde = '';
  hasta = '';
  operacion = '';
  operaciones = ['APERTURA', 'COMPRA_MERCADERIA', 'COMPRA_ACTIVO', 'PAGO_SERVICIO', 'HONORARIOS', 'VENTA_MERCADERIA', 'VENTA_SERVICIO', 'VENTA_ACTIVO', 'COBRANZA', 'PAGO_PROVEEDOR', 'PLANILLA', 'APORTE_CAPITAL', 'DEPRECIACION', 'LIQUIDACION_IGV', 'ESPECIAL', 'MANUAL', 'REVERSION', 'REGULARIZACION', 'CIERRE'];
  asientos = signal<AsientoVista[]>([]);
  motivos: Record<number, string> = {};
  errores = signal<Record<number, string>>({});

  ngOnInit() { this.cargar(); }
  cargar() { this.api.get<AsientoVista[]>('/asientos', { desde: this.desde, hasta: this.hasta, operacion: this.operacion }).subscribe((a) => this.asientos.set(a)); }
  total = (a: AsientoVista, lado: 'debe' | 'haber') => Math.round(a.lineas.reduce((s, l) => s + l[lado], 0) * 100) / 100;

  anular(a: AsientoVista) {
    this.api.post(`/asientos/${a.id}/anular`, { motivo: this.motivos[a.id] ?? '' }).subscribe({
      next: () => { this.errores.update((e) => ({ ...e, [a.id]: '' })); this.cargar(); },
      error: (e) => this.errores.update((x) => ({ ...x, [a.id]: errorDe(e).mensaje })),
    });
  }
}
