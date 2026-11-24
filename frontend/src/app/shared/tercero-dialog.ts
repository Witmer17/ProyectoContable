import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Api, errorDe } from '../core/api';

export type TipoTercero = 'CLIENTE' | 'PROVEEDOR' | 'SOCIO' | 'TRABAJADOR';
export interface Tercero { id: number; tipo: TipoTercero; tipoDoc: string; documento: string; nombre: string; direccion?: string; sueldo?: number; pension?: string }

/** Modal para crear un tercero sin salir de la pantalla; al guardar devuelve el nuevo registro. */
@Component({
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Nuevo {{ etiqueta }}</h2>
    <form [formGroup]="f" (ngSubmit)="guardar()">
      <mat-dialog-content>
        <mat-form-field><mat-label>Tipo de documento</mat-label>
          <mat-select formControlName="tipoDoc"><mat-option value="RUC">RUC (11 dígitos)</mat-option><mat-option value="DNI">DNI (8 dígitos)</mat-option></mat-select>
        </mat-form-field>
        <mat-form-field><mat-label>Número de documento</mat-label>
          <input matInput formControlName="documento" inputmode="numeric" autocomplete="off" />
          @if (errores()['documento']) { <mat-error>{{ errores()['documento'] }}</mat-error> }
        </mat-form-field>
        <mat-form-field><mat-label>Nombre o razón social</mat-label><input matInput formControlName="nombre" autocomplete="off" /></mat-form-field>
        <mat-form-field><mat-label>Dirección (opcional)</mat-label><input matInput formControlName="direccion" autocomplete="off" /></mat-form-field>
        @if (data.tipo === 'TRABAJADOR') {
          <mat-form-field><mat-label>Sueldo mensual</mat-label><input matInput type="number" min="0" formControlName="sueldo" /></mat-form-field>
          <mat-form-field><mat-label>Régimen de pensiones</mat-label>
            <mat-select formControlName="pension"><mat-option value="ONP">ONP (13 %)</mat-option><mat-option value="AFP">AFP</mat-option></mat-select>
          </mat-form-field>
        }
        @if (errores()['general']) { <p class="falta" role="alert">{{ errores()['general'] }}</p> }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="f.invalid || guardando()">Guardar</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class TerceroDialog {
  data = inject<{ tipo: TipoTercero }>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<TerceroDialog, Tercero>);
  private api = inject(Api);
  guardando = signal(false);
  errores = signal<Record<string, string>>({});
  f = inject(FormBuilder).nonNullable.group({
    tipoDoc: [this.data.tipo === 'CLIENTE' || this.data.tipo === 'PROVEEDOR' ? 'RUC' : 'DNI', Validators.required],
    documento: ['', [Validators.required, Validators.pattern(/^\d{8,11}$/)]],
    nombre: ['', Validators.required],
    direccion: [''],
    sueldo: [0],
    pension: ['ONP'],
  });
  etiqueta = { CLIENTE: 'cliente', PROVEEDOR: 'proveedor', SOCIO: 'socio', TRABAJADOR: 'trabajador' }[this.data.tipo];

  guardar() {
    this.guardando.set(true);
    const v = this.f.getRawValue();
    const cuerpo: Record<string, unknown> = { tipo: this.data.tipo, tipoDoc: v.tipoDoc, documento: v.documento, nombre: v.nombre, direccion: v.direccion || undefined };
    if (this.data.tipo === 'TRABAJADOR') Object.assign(cuerpo, { sueldo: Number(v.sueldo), pension: v.pension });
    this.api.post<Tercero>('/terceros', cuerpo).subscribe({
      next: (t) => this.ref.close(t),
      error: (e) => { const er = errorDe(e); this.errores.set({ [er.campo === 'documento' ? 'documento' : 'general']: er.mensaje }); this.guardando.set(false); },
    });
  }
}
