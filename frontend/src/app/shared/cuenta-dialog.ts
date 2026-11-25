import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Api, errorDe } from '../core/api';

export interface CuentaData {
  codigo?: string;
  nombre?: string;
  naturaleza?: 'DEUDORA' | 'ACREEDORA';
  requiereDestino?: boolean;
  destinoDefecto?: string;
  activa?: boolean;
  ultimoNivel?: boolean;
  modoEdicion?: boolean;
}

@Component({
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <h2 mat-dialog-title>{{ data.modoEdicion ? 'Editar cuenta ' + data.codigo : 'Nueva cuenta contable' }}</h2>
    <form [formGroup]="f" (ngSubmit)="guardar()">
      <mat-dialog-content style="display:flex; flex-direction:column; gap:8px; min-width:320px;">
        @if (!data.modoEdicion) {
          <mat-form-field>
            <mat-label>Código contable (2 a 8 dígitos)</mat-label>
            <input matInput formControlName="codigo" autocomplete="off" />
            @if (errores()['codigo']) { <mat-error>{{ errores()['codigo'] }}</mat-error> }
          </mat-form-field>
        }
        <mat-form-field>
          <mat-label>Nombre o descripción</mat-label>
          <input matInput formControlName="nombre" autocomplete="off" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Naturaleza</mat-label>
          <mat-select formControlName="naturaleza">
            <mat-option value="DEUDORA">Deudora</mat-option>
            <mat-option value="ACREEDORA">Acreedora</mat-option>
          </mat-select>
        </mat-form-field>
        <div style="display:flex; gap:16px; align-items:center; margin:8px 0;">
          <mat-slide-toggle formControlName="requiereDestino">Requiere destino (Elemento 9 / 79)</mat-slide-toggle>
        </div>
        @if (f.value.requiereDestino) {
          <mat-form-field>
            <mat-label>Destino por defecto (ej. 94, 95, 92)</mat-label>
            <input matInput formControlName="destinoDefecto" />
          </mat-form-field>
        }
        <div style="display:flex; gap:16px; align-items:center; margin:8px 0;">
          <mat-slide-toggle formControlName="ultimoNivel">Es cuenta de registro (último nivel)</mat-slide-toggle>
        </div>
        <div style="display:flex; gap:16px; align-items:center; margin:8px 0;">
          <mat-slide-toggle formControlName="activa">Cuenta activa</mat-slide-toggle>
        </div>
        @if (errores()['general']) { <p class="falta" role="alert">{{ errores()['general'] }}</p> }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="f.invalid || guardando()">Guardar</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class CuentaDialog {
  data = inject<CuentaData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<CuentaDialog, any>);
  private api = inject(Api);
  guardando = signal(false);
  errores = signal<Record<string, string>>({});

  f = inject(FormBuilder).nonNullable.group({
    codigo: [this.data.codigo || '', [Validators.required, Validators.pattern(/^\d{2,8}$/)]],
    nombre: [this.data.nombre || '', Validators.required],
    naturaleza: [this.data.naturaleza || 'DEUDORA', Validators.required],
    requiereDestino: [this.data.requiereDestino || false],
    destinoDefecto: [this.data.destinoDefecto || ''],
    activa: [this.data.activa ?? true],
    ultimoNivel: [this.data.ultimoNivel ?? true],
  });

  guardar() {
    this.guardando.set(true);
    const v = this.f.getRawValue();
    if (this.data.modoEdicion) {
      this.api.patch(`/cuentas/${this.data.codigo}`, {
        nombre: v.nombre,
        naturaleza: v.naturaleza,
        requiereDestino: v.requiereDestino,
        destinoDefecto: v.destinoDefecto || null,
        activa: v.activa,
        ultimoNivel: v.ultimoNivel,
      }).subscribe({
        next: (res) => this.ref.close(res),
        error: (e) => {
          const er = errorDe(e);
          this.errores.set({ general: er.mensaje });
          this.guardando.set(false);
        },
      });
    } else {
      this.api.post('/cuentas', {
        codigo: v.codigo,
        nombre: v.nombre,
        naturaleza: v.naturaleza,
        requiereDestino: v.requiereDestino,
        destinoDefecto: v.destinoDefecto || null,
        ultimoNivel: v.ultimoNivel,
      }).subscribe({
        next: (res) => this.ref.close(res),
        error: (e) => {
          const er = errorDe(e);
          this.errores.set({ [er.campo === 'codigo' ? 'codigo' : 'general']: er.mensaje });
          this.guardando.set(false);
        },
      });
    }
  }
}
