import { Component, effect, inject, input, model, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Api } from '../core/api';
import { Tercero, TerceroDialog, TipoTercero } from './tercero-dialog';
import { Auth } from '../core/auth';

/** Selector de cliente/proveedor/socio/trabajador con botón "+ Nuevo" y aviso "Falta registrar". */
@Component({
  selector: 'app-selector-tercero',
  imports: [MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule],
  template: `
    <div class="fila" style="align-items:center; gap:8px">
      <div style="flex:1 1 220px">
        <mat-form-field [class.rojo]="falta()">
          <mat-label>{{ etiqueta() }}</mat-label>
          <mat-select [value]="terceroId()" (selectionChange)="terceroId.set($event.value)" [attr.aria-label]="etiqueta()">
            @for (t of lista(); track t.id) { <mat-option [value]="t.id">{{ t.nombre }} · {{ t.documento }}</mat-option> }
          </mat-select>
        </mat-form-field>
        @if (falta()) { <div class="falta" role="alert">Falta registrar</div> }
      </div>
      @if (auth.registra()) { <button mat-stroked-button type="button" (click)="nuevo()"><mat-icon>add</mat-icon> Nuevo</button> }
    </div>
  `,
  styles: [':host{display:block}'],
})
export class SelectorTercero {
  tipo = input.required<TipoTercero>();
  etiqueta = input('Tercero');
  falta = input(false);
  terceroId = model<number | null>(null);
  lista = signal<Tercero[]>([]);
  auth = inject(Auth);
  private api = inject(Api);
  private dialog = inject(MatDialog);

  constructor() { effect(() => this.cargar()); }

  private cargar() { this.api.get<Tercero[]>('/terceros', { tipo: this.tipo() }).subscribe((l) => this.lista.set(l)); }

  nuevo() {
    this.dialog.open<TerceroDialog, { tipo: TipoTercero }, Tercero>(TerceroDialog, { data: { tipo: this.tipo() }, width: '420px' }).afterClosed().subscribe((t) => {
      if (!t) return;
      this.lista.update((l) => [...l, t].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      this.terceroId.set(t.id);
    });
  }
}
