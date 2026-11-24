import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Api, errorDe } from '../core/api';
import { Auth } from '../core/auth';
import { EmpresaStore as EmpresaStoreRef } from '../core/empresa';
import { soles } from '../core/util';
import { Producto, ProductoDialog } from '../shared/producto-dialog';
import { Cuenta } from '../shared/selector-cuenta';
import { Tercero, TerceroDialog, TipoTercero } from '../shared/tercero-dialog';

@Component({
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatIconModule, MatInputModule],
  template: `
    <div class="pagina">
      <h1>Clientes, proveedores, socios y trabajadores</h1>
      <div class="fila" style="align-items:center">
        <mat-form-field><mat-label>Tipo</mat-label>
          <mat-select [(ngModel)]="tipo" (selectionChange)="cargar()">
            <mat-option value="">Todos</mat-option><mat-option value="CLIENTE">Clientes</mat-option><mat-option value="PROVEEDOR">Proveedores</mat-option><mat-option value="SOCIO">Socios</mat-option>
            @if (store.modulos()?.planilla) { <mat-option value="TRABAJADOR">Trabajadores</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field><mat-label>Buscar</mat-label><input matInput [(ngModel)]="q" (input)="cargar()" /></mat-form-field>
      </div>
      @if (auth.registra()) {
        <div class="acciones" style="margin:0 0 12px">
          @for (t of nuevos(); track t.v) { <button mat-stroked-button type="button" (click)="nuevo(t.v)"><mat-icon>add</mat-icon> {{ t.t }}</button> }
        </div>
      }
      <div class="scroll"><table class="t">
        <thead><tr><th>Tipo</th><th>Documento</th><th>Nombre</th><th>Dirección</th></tr></thead>
        <tbody>@for (t of lista(); track t.id) { <tr><td>{{ t.tipo }}</td><td>{{ t.tipoDoc }} {{ t.documento }}</td><td>{{ t.nombre }}</td><td>{{ t.direccion }}</td></tr> } @empty { <tr><td colspan="4" class="muted">Sin registros.</td></tr> }</tbody>
      </table></div>
    </div>
  `,
})
export class Terceros implements OnInit {
  private api = inject(Api);
  private dialog = inject(MatDialog);
  auth = inject(Auth);
  store = inject(EmpresaStoreRef);
  tipo = '';
  q = '';
  lista = signal<Tercero[]>([]);
  nuevos = computed(() => [
    { v: 'CLIENTE' as TipoTercero, t: 'Cliente' }, { v: 'PROVEEDOR' as TipoTercero, t: 'Proveedor' }, { v: 'SOCIO' as TipoTercero, t: 'Socio' },
    ...(this.store.modulos()?.planilla ? [{ v: 'TRABAJADOR' as TipoTercero, t: 'Trabajador' }] : []),
  ]);
  ngOnInit() { this.cargar(); }
  cargar() { this.api.get<Tercero[]>('/terceros', { tipo: this.tipo, q: this.q }).subscribe((l) => this.lista.set(l)); }
  nuevo(tipo: TipoTercero) { this.dialog.open(TerceroDialog, { data: { tipo }, width: '420px' }).afterClosed().subscribe((t) => t && this.cargar()); }
}

@Component({
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="pagina">
      <h1>Productos y kárdex</h1>
      <p class="muted">Método de costo: promedio ponderado. El costo de cada venta sale del kárdex.</p>
      @if (auth.registra()) { <button mat-stroked-button type="button" (click)="nuevo()"><mat-icon>add</mat-icon> Nuevo producto</button> }
      <div class="scroll" style="margin-top:12px"><table class="t">
        <thead><tr><th>Código</th><th>Producto</th><th>Unidad</th><th class="num">Stock</th><th class="num">Costo prom.</th><th></th></tr></thead>
        <tbody>
          @for (p of lista(); track p.id) {
            <tr><td>{{ p.codigo }}</td><td>{{ p.nombre }}</td><td>{{ p.unidad }}</td><td class="num">{{ p.stock }}</td><td class="num">{{ soles(p.costoPromedio) }}</td><td><button mat-button type="button" (click)="ver(p.id)">Ver kárdex</button></td></tr>
          } @empty { <tr><td colspan="6" class="muted">Falta registrar productos.</td></tr> }
        </tbody>
      </table></div>
      @if (kardex(); as k) {
        <h2>Kárdex de {{ k.producto.nombre }}</h2>
        <div class="scroll"><table class="t">
          <thead><tr><th>Fecha</th><th>Movimiento</th><th class="num">Cantidad</th><th class="num">Costo unit.</th><th class="num">Costo total</th><th class="num">Saldo cant.</th><th class="num">Saldo S/</th></tr></thead>
          <tbody>@for (m of k.movimientos; track $index) { <tr><td>{{ m.fecha }}</td><td>{{ m.tipo === 'ENTRADA' ? 'Entrada' : 'Salida' }}</td><td class="num">{{ m.cantidad }}</td><td class="num">{{ soles(m.costoUnit) }}</td><td class="num">{{ soles(m.costoTotal) }}</td><td class="num">{{ m.saldoCant }}</td><td class="num">{{ soles(m.saldoCosto) }}</td></tr> }</tbody>
        </table></div>
      }
    </div>
  `,
})
export class Productos implements OnInit {
  private api = inject(Api);
  private dialog = inject(MatDialog);
  auth = inject(Auth);
  soles = soles;
  lista = signal<Producto[]>([]);
  kardex = signal<{ producto: Producto; movimientos: { fecha: string; tipo: string; cantidad: number; costoUnit: number; costoTotal: number; saldoCant: number; saldoCosto: number }[] } | null>(null);
  ngOnInit() { this.cargar(); }
  cargar() { this.api.get<Producto[]>('/productos').subscribe((l) => this.lista.set(l)); }
  ver(id: number) { this.api.get<any>(`/productos/${id}/kardex`).subscribe((k) => this.kardex.set(k)); }
  nuevo() { this.dialog.open(ProductoDialog, { width: '420px' }).afterClosed().subscribe((p) => p && this.cargar()); }
}

@Component({
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="pagina">
      <h1>Activos fijos</h1>
      <p class="muted">Los bienes comprados desde "Compré un activo" se dan de alta solos. La depreciación mensual se calcula en "Depreciación del mes".</p>
      <div class="scroll"><table class="t">
        <thead><tr><th>Bien</th><th>Cuenta</th><th>Compra</th><th class="num">Valor</th><th class="num">Tasa anual</th><th class="num">Depreciado</th><th>Estado</th></tr></thead>
        <tbody>@for (a of lista(); track a.id) { <tr><td>{{ a.nombre }}</td><td>{{ a.cuenta }}</td><td>{{ a.fechaCompra }}</td><td class="num">{{ soles(a.valor) }}</td><td class="num">{{ a.tasaAnual * 100 }} %</td><td class="num">{{ soles(a.depreciado) }}</td><td>{{ a.estado }}</td></tr> } @empty { <tr><td colspan="7" class="muted">Sin activos.</td></tr> }</tbody>
      </table></div>
      @if (auth.registra()) {
        <h2>Dar de alta un bien existente</h2>
        <form [formGroup]="f" (ngSubmit)="alta()" class="fila">
          <mat-form-field><mat-label>Nombre</mat-label><input matInput formControlName="nombre" /></mat-form-field>
          <mat-form-field><mat-label>Tipo</mat-label><mat-select formControlName="cuenta"><mat-option value="3341">Vehículo</mat-option><mat-option value="3351">Mueble o enseres</mat-option><mat-option value="336">Equipo diverso</mat-option><mat-option value="333">Maquinaria</mat-option><mat-option value="332">Edificación</mat-option></mat-select></mat-form-field>
          <mat-form-field><mat-label>Fecha de compra</mat-label><input matInput type="date" formControlName="fechaCompra" /></mat-form-field>
          <mat-form-field><mat-label>Valor (S/)</mat-label><input matInput type="number" min="0" formControlName="valor" /></mat-form-field>
          <button mat-flat-button type="submit" [disabled]="f.invalid">Guardar</button>
        </form>
        @if (error()) { <div class="falta" role="alert">{{ error() }}</div> }
      }
    </div>
  `,
})
export class Activos implements OnInit {
  private api = inject(Api);
  auth = inject(Auth);
  soles = soles;
  lista = signal<{ id: number; nombre: string; cuenta: string; fechaCompra: string; valor: number; tasaAnual: number; depreciado: number; estado: string }[]>([]);
  error = signal('');
  f = inject(FormBuilder).nonNullable.group({ nombre: ['', Validators.required], cuenta: ['3351', Validators.required], fechaCompra: ['', Validators.required], valor: [0, [Validators.required, Validators.min(0.01)]] });
  ngOnInit() { this.cargar(); }
  cargar() { this.api.get<any[]>('/activos').subscribe((l) => this.lista.set(l)); }
  alta() { this.api.post('/activos', this.f.getRawValue()).subscribe({ next: () => { this.cargar(); this.f.reset({ cuenta: '3351', valor: 0 }); }, error: (e) => this.error.set(errorDe(e).mensaje) }); }
}

@Component({
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule],
  template: `
    <div class="pagina">
      <h1>Plan de cuentas (PCGE 2019)</h1>
      <p class="muted">Se muestran las cuentas de último nivel que corresponden al perfil de la empresa. Los administradores pueden incluir las ocultas.</p>
      <div class="fila" style="align-items:center">
        <mat-form-field><mat-label>Buscar por código o nombre</mat-label><input matInput [(ngModel)]="q" (input)="cargar()" /></mat-form-field>
        @if (auth.esAdmin()) { <mat-slide-toggle [(ngModel)]="todas" (change)="cargar()">Ver todas (incluye inactivas)</mat-slide-toggle> }
      </div>
      <div class="scroll"><table class="t">
        <thead><tr><th>Código</th><th>Nombre</th><th>Naturaleza</th><th>Destino</th>@if (auth.esAdmin()) { <th>Activa</th> }</tr></thead>
        <tbody>
          @for (c of lista(); track c.codigo) {
            <tr><td>{{ c.codigo }}</td><td>{{ c.nombre }}</td><td>{{ c.naturaleza === 'DEUDORA' ? 'Deudora' : 'Acreedora' }}</td><td>{{ c.requiereDestino ? 'Requiere destino' : '' }}</td>
              @if (auth.esAdmin()) { <td><mat-slide-toggle [ngModel]="c['activa']" (ngModelChange)="activar(c, $event)" [attr.aria-label]="'Activar ' + c.codigo" /></td> }
            </tr>
          }
        </tbody>
      </table></div>
    </div>
  `,
})
export class PlanCuentas implements OnInit {
  private api = inject(Api);
  auth = inject(Auth);
  q = '';
  todas = false;
  lista = signal<(Cuenta & Record<string, any>)[]>([]);
  ngOnInit() { this.cargar(); }
  cargar() { this.api.get<any[]>('/cuentas', { q: this.q, todas: this.todas ? 'true' : undefined }).subscribe((l) => this.lista.set(l)); }
  activar(c: Cuenta, activa: boolean) { this.api.patch(`/cuentas/${c.codigo}`, { activa }).subscribe(); }
}
