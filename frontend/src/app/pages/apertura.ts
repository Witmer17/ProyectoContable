import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Api, errorDe } from '../core/api';
import { r2 } from '../core/util';
import { Producto } from '../shared/producto-dialog';
import { SelectorCuenta } from '../shared/selector-cuenta';
import { LineaVista, TablaAsiento } from '../shared/tabla-asiento';
import { Tercero } from '../shared/tercero-dialog';

interface L { cuenta: string; debe: number; haber: number }
interface Pend { sentido: 'COMPRA' | 'VENTA'; terceroId: number | null; tipo: string; serie: string; numero: string; fecha: string; total: number }
interface Ex { productoId: number | null; cantidad: number; costoTotal: number }
interface Ac { nombre: string; cuenta: string; fechaCompra: string; valor: number; depreciado: number }

@Component({
  imports: [FormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, SelectorCuenta, TablaAsiento],
  template: `
    <div class="pagina">
      <h1>Asiento de apertura</h1>
      <p class="muted">Ingresa los saldos al inicio del ejercicio. Debe = Haber antes de guardar. El detalle de cobros, pagos, productos y activos debe sumar lo mismo que su cuenta.</p>
      <mat-card style="padding:16px">
        <mat-form-field style="max-width:220px"><mat-label>Fecha de apertura</mat-label><input matInput type="date" [(ngModel)]="fecha" /></mat-form-field>
        <h3>Saldos por cuenta</h3>
        @for (l of lineas(); track $index; let i = $index) {
          <div class="fila" style="align-items:flex-start">
            <div style="flex:3 1 340px"><app-selector-cuenta [codigo]="l.cuenta" (codigoChange)="editar(i, { cuenta: $event })" /></div>
            <mat-form-field class="angosto"><mat-label>Debe</mat-label><input matInput type="number" min="0" step="0.01" [ngModel]="l.debe || ''" (ngModelChange)="editar(i, { debe: +$event, haber: 0 })" /></mat-form-field>
            <mat-form-field class="angosto"><mat-label>Haber</mat-label><input matInput type="number" min="0" step="0.01" [ngModel]="l.haber || ''" (ngModelChange)="editar(i, { haber: +$event, debe: 0 })" /></mat-form-field>
            <button mat-icon-button type="button" (click)="lineas.update(ls => ls.filter((_, k) => k !== i))" aria-label="Quitar línea"><mat-icon>delete</mat-icon></button>
          </div>
        }
        <button mat-stroked-button type="button" (click)="lineas.update(ls => [...ls, { cuenta: '', debe: 0, haber: 0 }])"><mat-icon>add</mat-icon> Agregar cuenta</button>
        <p><strong>Debe {{ totalDebe() }} · Haber {{ totalHaber() }}</strong> · <span [class]="cuadra() ? 'cuadra' : 'nocuadra'">{{ cuadra() ? 'Cuadra' : 'No cuadra, revisa los montos' }}</span></p>

        <h3>Existencias (producto, cantidad y costo)</h3>
        @for (e of existencias(); track $index; let i = $index) {
          <div class="fila" style="align-items:center">
            <mat-form-field style="flex:2 1 200px"><mat-label>Producto</mat-label><mat-select [ngModel]="e.productoId" (ngModelChange)="editarEx(i, { productoId: $event })">@for (p of productos(); track p.id) { <mat-option [value]="p.id">{{ p.codigo }} · {{ p.nombre }}</mat-option> }</mat-select></mat-form-field>
            <mat-form-field class="angosto"><mat-label>Cantidad</mat-label><input matInput type="number" [ngModel]="e.cantidad" (ngModelChange)="editarEx(i, { cantidad: +$event })" /></mat-form-field>
            <mat-form-field class="angosto"><mat-label>Costo total</mat-label><input matInput type="number" step="0.01" [ngModel]="e.costoTotal" (ngModelChange)="editarEx(i, { costoTotal: +$event })" /></mat-form-field>
            <button mat-icon-button type="button" (click)="existencias.update(l => l.filter((_, k) => k !== i))" aria-label="Quitar"><mat-icon>delete</mat-icon></button>
          </div>
        }
        <button mat-stroked-button type="button" (click)="existencias.update(l => [...l, { productoId: null, cantidad: 0, costoTotal: 0 }])"><mat-icon>add</mat-icon> Agregar producto</button>

        <h3>Facturas pendientes (cuentas 1212 y 4212)</h3>
        @for (p of pendientes(); track $index; let i = $index) {
          <div class="fila" style="align-items:center">
            <mat-form-field class="angosto"><mat-label>Tipo</mat-label><mat-select [ngModel]="p.sentido" (ngModelChange)="editarPend(i, { sentido: $event, terceroId: null })"><mat-option value="VENTA">Por cobrar</mat-option><mat-option value="COMPRA">Por pagar</mat-option></mat-select></mat-form-field>
            <mat-form-field style="flex:2 1 200px"><mat-label>{{ p.sentido === 'VENTA' ? 'Cliente' : 'Proveedor' }}</mat-label><mat-select [ngModel]="p.terceroId" (ngModelChange)="editarPend(i, { terceroId: $event })">@for (t of tercerosDe(p.sentido); track t.id) { <mat-option [value]="t.id">{{ t.nombre }}</mat-option> }</mat-select></mat-form-field>
            <mat-form-field class="angosto"><mat-label>Serie</mat-label><input matInput [ngModel]="p.serie" (ngModelChange)="editarPend(i, { serie: $event })" /></mat-form-field>
            <mat-form-field class="angosto"><mat-label>Número</mat-label><input matInput [ngModel]="p.numero" (ngModelChange)="editarPend(i, { numero: $event })" /></mat-form-field>
            <mat-form-field class="angosto"><mat-label>Emisión</mat-label><input matInput type="date" [ngModel]="p.fecha" (ngModelChange)="editarPend(i, { fecha: $event })" /></mat-form-field>
            <mat-form-field class="angosto"><mat-label>Saldo</mat-label><input matInput type="number" step="0.01" [ngModel]="p.total" (ngModelChange)="editarPend(i, { total: +$event })" /></mat-form-field>
            <button mat-icon-button type="button" (click)="pendientes.update(l => l.filter((_, k) => k !== i))" aria-label="Quitar"><mat-icon>delete</mat-icon></button>
          </div>
        }
        <button mat-stroked-button type="button" (click)="pendientes.update(l => [...l, { sentido: 'VENTA', terceroId: null, tipo: '01', serie: '', numero: '', fecha: fecha, total: 0 }])"><mat-icon>add</mat-icon> Agregar factura</button>

        <h3>Activos fijos (cuentas 33xx)</h3>
        @for (a of activos(); track $index; let i = $index) {
          <div class="fila" style="align-items:center">
            <mat-form-field style="flex:2 1 160px"><mat-label>Bien</mat-label><input matInput [ngModel]="a.nombre" (ngModelChange)="editarAc(i, { nombre: $event })" /></mat-form-field>
            <mat-form-field class="angosto"><mat-label>Cuenta</mat-label><mat-select [ngModel]="a.cuenta" (ngModelChange)="editarAc(i, { cuenta: $event })"><mat-option value="3341">3341 Vehículos</mat-option><mat-option value="3351">3351 Muebles</mat-option><mat-option value="336">336 Equipos</mat-option><mat-option value="333">333 Maquinaria</mat-option><mat-option value="332">332 Edificación</mat-option></mat-select></mat-form-field>
            <mat-form-field class="angosto"><mat-label>Compra</mat-label><input matInput type="date" [ngModel]="a.fechaCompra" (ngModelChange)="editarAc(i, { fechaCompra: $event })" /></mat-form-field>
            <mat-form-field class="angosto"><mat-label>Valor</mat-label><input matInput type="number" step="0.01" [ngModel]="a.valor" (ngModelChange)="editarAc(i, { valor: +$event })" /></mat-form-field>
            <mat-form-field class="angosto"><mat-label>Depreciado</mat-label><input matInput type="number" step="0.01" [ngModel]="a.depreciado" (ngModelChange)="editarAc(i, { depreciado: +$event })" /></mat-form-field>
            <button mat-icon-button type="button" (click)="activos.update(l => l.filter((_, k) => k !== i))" aria-label="Quitar"><mat-icon>delete</mat-icon></button>
          </div>
        }
        <button mat-stroked-button type="button" (click)="activos.update(l => [...l, { nombre: '', cuenta: '3341', fechaCompra: fecha, valor: 0, depreciado: 0 }])"><mat-icon>add</mat-icon> Agregar activo</button>

        @if (error()) { <p class="falta" role="alert">{{ error() }}</p> }
        @if (vista(); as v) {
          <h3>Revisión</h3>
          <app-tabla-asiento [lineas]="v.lineas" [debe]="v.totales.debe" [haber]="v.totales.haber" [cuadra]="v.totales.cuadra" />
        }
        <div class="acciones">
          <button mat-stroked-button type="button" (click)="demo()">Cargar apertura DEMO simple</button>
          <button mat-stroked-button type="button" (click)="revisar()">Revisar</button>
          <button mat-flat-button type="button" (click)="guardar()" [disabled]="!vista()?.totales?.cuadra">Guardar apertura</button>
        </div>
      </mat-card>
    </div>
  `,
})
export class Apertura {
  private api = inject(Api);
  private router = inject(Router);
  fecha = `${new Date().getFullYear()}-01-01`;
  lineas = signal<L[]>([{ cuenta: '', debe: 0, haber: 0 }, { cuenta: '', debe: 0, haber: 0 }]);
  existencias = signal<Ex[]>([]);
  pendientes = signal<Pend[]>([]);
  activos = signal<Ac[]>([]);
  productos = signal<Producto[]>([]);
  terceros = signal<Tercero[]>([]);
  vista = signal<{ lineas: LineaVista[]; totales: { debe: number; haber: number; cuadra: boolean } } | null>(null);
  error = signal('');
  totalDebe = computed(() => r2(this.lineas().reduce((s, l) => s + (l.debe || 0), 0)));
  totalHaber = computed(() => r2(this.lineas().reduce((s, l) => s + (l.haber || 0), 0)));
  cuadra = computed(() => this.totalDebe() === this.totalHaber() && this.totalDebe() > 0);

  constructor() {
    this.api.get<Producto[]>('/productos').subscribe((p) => this.productos.set(p));
    this.api.get<Tercero[]>('/terceros').subscribe((t) => this.terceros.set(t));
  }

  tercerosDe = (s: 'COMPRA' | 'VENTA') => this.terceros().filter((t) => t.tipo === (s === 'VENTA' ? 'CLIENTE' : 'PROVEEDOR'));
  editar(i: number, c: Partial<L>) { this.lineas.update((l) => l.map((x, k) => (k === i ? { ...x, ...c } : x))); this.vista.set(null); }
  editarEx(i: number, c: Partial<Ex>) { this.existencias.update((l) => l.map((x, k) => (k === i ? { ...x, ...c } : x))); this.vista.set(null); }
  editarPend(i: number, c: Partial<Pend>) { this.pendientes.update((l) => l.map((x, k) => (k === i ? { ...x, ...c } : x))); this.vista.set(null); }
  editarAc(i: number, c: Partial<Ac>) { this.activos.update((l) => l.map((x, k) => (k === i ? { ...x, ...c } : x))); this.vista.set(null); }

  /** Datos de la sección 9: caja 10,000, banco 20,000, mercadería 5,000 (100 u. del Producto A) y capital 35,000. */
  demo() {
    this.lineas.set([{ cuenta: '101', debe: 10000, haber: 0 }, { cuenta: '1041', debe: 20000, haber: 0 }, { cuenta: '20111', debe: 5000, haber: 0 }, { cuenta: '501', debe: 0, haber: 35000 }]);
    const a = this.productos().find((p) => p.codigo === 'PA');
    this.existencias.set(a ? [{ productoId: a.id, cantidad: 100, costoTotal: 5000 }] : []);
    this.pendientes.set([]); this.activos.set([]); this.vista.set(null);
  }

  private payload() {
    return {
      tipo: 'APERTURA', fecha: this.fecha, glosa: `Asiento de apertura al ${this.fecha}`,
      lineas: this.lineas().filter((l) => l.cuenta).map((l) => ({ cuenta: l.cuenta, debe: l.debe || 0, haber: l.haber || 0 })),
      existencias: this.existencias().filter((e) => e.productoId),
      pendientes: this.pendientes().filter((p) => p.terceroId).map((p) => ({ ...p, serie: p.serie.toUpperCase() })),
      activos: this.activos().filter((a) => a.nombre),
    };
  }

  revisar() {
    this.error.set('');
    this.api.post<{ lineas: LineaVista[]; totales: { debe: number; haber: number; cuadra: boolean } }>('/operaciones/previsualizar', this.payload()).subscribe({ next: (v) => this.vista.set(v), error: (e) => { this.vista.set(null); this.error.set(errorDe(e).mensaje); } });
  }
  guardar() { this.api.post('/operaciones', this.payload()).subscribe({ next: () => this.router.navigateByUrl('/asientos'), error: (e) => this.error.set(errorDe(e).mensaje) }); }
}
