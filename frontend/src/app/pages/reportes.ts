import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Api, errorDe } from '../core/api';
import { EmpresaStore } from '../core/empresa';
import { hoy, primerDiaMes, soles } from '../core/util';

interface Col { key: string; titulo: string; tipo?: string }
interface Rep { titulo: string; subtitulo?: string; columnas: Col[]; filas: Record<string, any>[]; totales?: Record<string, any>; resumen?: Record<string, any> }
interface Def { id: string; ruta: string; nombre: string; filtros: ('rango' | 'hasta' | 'periodo' | 'cuenta' | 'producto' | 'operacion')[]; visible?: () => boolean }

@Component({
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="pagina">
      <h1>Reportes</h1>
      <div class="fila">
        <mat-form-field><mat-label>Reporte</mat-label>
          <mat-select [ngModel]="id()" (ngModelChange)="elegir($event)">@for (d of disponibles(); track d.id) { <mat-option [value]="d.id">{{ d.nombre }}</mat-option> }</mat-select>
        </mat-form-field>
        @if (def().filtros.includes('rango')) {
          <mat-form-field class="angosto"><mat-label>Desde</mat-label><input matInput type="date" [(ngModel)]="desde" /></mat-form-field>
          <mat-form-field class="angosto"><mat-label>Hasta</mat-label><input matInput type="date" [(ngModel)]="hasta" /></mat-form-field>
        }
        @if (def().filtros.includes('hasta')) { <mat-form-field class="angosto"><mat-label>Al</mat-label><input matInput type="date" [(ngModel)]="hasta" /></mat-form-field> }
        @if (def().filtros.includes('periodo')) { <mat-form-field class="angosto"><mat-label>Mes</mat-label><input matInput type="month" [(ngModel)]="periodo" /></mat-form-field> }
        @if (def().filtros.includes('cuenta')) { <mat-form-field class="angosto"><mat-label>Cuenta (opcional)</mat-label><input matInput [(ngModel)]="cuenta" /></mat-form-field> }
        @if (def().filtros.includes('operacion')) { <mat-form-field class="angosto"><mat-label>Operación (opcional)</mat-label><input matInput [(ngModel)]="operacion" placeholder="p. ej. PLANILLA" /></mat-form-field> }
      </div>
      <div class="acciones" style="margin-top:0">
        <button mat-flat-button type="button" (click)="ver()">Ver reporte</button>
        <button mat-stroked-button type="button" (click)="exportar('xlsx')" [disabled]="!rep()">Excel</button>
        <button mat-stroked-button type="button" (click)="exportar('pdf')" [disabled]="!rep()">PDF</button>
      </div>
      @if (error()) { <p class="falta" role="alert">{{ error() }}</p> }
      @if (rep(); as r) {
        <h2>{{ r.titulo }}</h2><p class="muted">{{ r.subtitulo }}</p>
        @if (r.resumen && 'cuadra' in r.resumen) { <p><span [class]="r.resumen['cuadra'] ? 'cuadra' : 'nocuadra'">{{ r.resumen['cuadra'] ? 'Cuadra' : 'No cuadra' }}</span></p> }
        <div class="scroll"><table class="t">
          <thead><tr>@for (c of r.columnas; track c.key) { <th [class.num]="c.tipo === 'num'">{{ c.titulo }}</th> }</tr></thead>
          <tbody>
            @for (f of r.filas; track $index) { <tr [class.negrita]="f['negrita']">@for (c of r.columnas; track c.key) { <td [class.num]="c.tipo === 'num'">{{ celda(f[c.key], c) }}</td> }</tr> }
            @empty { <tr><td [attr.colspan]="r.columnas.length" class="muted">Sin datos para este filtro.</td></tr> }
          </tbody>
          @if (r.totales) { <tfoot><tr class="negrita">@for (c of r.columnas; track c.key) { <td [class.num]="c.tipo === 'num'">{{ celda(r.totales[c.key], c) }}</td> }</tr></tfoot> }
        </table></div>
      }
    </div>
  `,
})
export class Reportes {
  private api = inject(Api);
  private store = inject(EmpresaStore);
  defs: Def[] = [
    { id: 'diario', ruta: 'libro-diario', nombre: 'Libro Diario', filtros: ['rango', 'operacion'] },
    { id: 'mayor', ruta: 'libro-mayor', nombre: 'Libro Mayor', filtros: ['rango', 'cuenta'] },
    { id: 'balance', ruta: 'balance-comprobacion', nombre: 'Balance de comprobación', filtros: ['rango'] },
    { id: 'resultados', ruta: 'estado-resultados', nombre: 'Estado de Resultados', filtros: ['rango'] },
    { id: 'situacion', ruta: 'situacion-financiera', nombre: 'Estado de Situación Financiera', filtros: ['hasta'] },
    { id: 'compras', ruta: 'registro-compras', nombre: 'Registro de Compras', filtros: ['rango'] },
    { id: 'ventas', ruta: 'registro-ventas', nombre: 'Registro de Ventas', filtros: ['rango'] },
    { id: 'cobrar', ruta: 'pendientes/por-cobrar', nombre: 'Cuentas por cobrar', filtros: [] },
    { id: 'pagar', ruta: 'pendientes/por-pagar', nombre: 'Cuentas por pagar', filtros: [] },
    { id: 'kardex', ruta: 'kardex', nombre: 'Kárdex', filtros: [], visible: () => !!this.store.modulos()?.kardex },
    { id: 'igv', ruta: 'liquidacion-igv', nombre: 'Liquidación de IGV', filtros: ['periodo'] },
  ];
  disponibles = computed(() => this.defs.filter((d) => !d.visible || d.visible()));
  id = signal('balance');
  def = computed(() => this.defs.find((d) => d.id === this.id())!);
  desde = primerDiaMes();
  hasta = hoy();
  periodo = hoy().slice(0, 7);
  cuenta = '';
  operacion = '';
  rep = signal<Rep | null>(null);
  error = signal('');

  elegir(id: string) { this.id.set(id); this.rep.set(null); this.error.set(''); }

  private params(formato?: string) {
    const f = this.def().filtros;
    return {
      desde: f.includes('rango') ? this.desde : undefined, hasta: f.includes('rango') || f.includes('hasta') ? this.hasta : undefined,
      periodo: f.includes('periodo') ? this.periodo : undefined, cuenta: this.cuenta || undefined, operacion: this.operacion || undefined, formato,
    } as Record<string, string | undefined>;
  }

  ver() {
    this.error.set('');
    this.api.get<Rep>(`/reportes/${this.def().ruta}`, this.params()).subscribe({ next: (r) => this.rep.set(r), error: (e) => this.error.set(errorDe(e).mensaje) });
  }
  exportar(f: 'xlsx' | 'pdf') { this.api.descargar(`/reportes/${this.def().ruta}`, this.params(f), `${this.def().ruta.replace('/', '-')}.${f}`); }
  celda(v: unknown, c: Col) { return c.tipo === 'num' && typeof v === 'number' ? soles(v) : v ?? ''; }
}
