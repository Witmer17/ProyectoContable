import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Api, errorDe } from '../core/api';
import { EmpresaStore } from '../core/empresa';

export interface Producto { id: number; codigo: string; nombre: string; unidad: string; tipo: string; stock: number; costoPromedio: number }

@Component({
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Nuevo producto</h2>
    <form [formGroup]="f" (ngSubmit)="guardar()">
      <mat-dialog-content>
        <mat-form-field><mat-label>Código</mat-label><input matInput formControlName="codigo" autocomplete="off" /></mat-form-field>
        <mat-form-field><mat-label>Nombre</mat-label><input matInput formControlName="nombre" autocomplete="off" /></mat-form-field>
        <mat-form-field><mat-label>Unidad</mat-label><input matInput formControlName="unidad" /></mat-form-field>
        @if (store.modulos()?.industrial) {
          <mat-form-field><mat-label>Tipo</mat-label>
            <mat-select formControlName="tipo">
              <mat-option value="MERCADERIA">Mercadería</mat-option><mat-option value="MATERIA_PRIMA">Insumo (materia prima)</mat-option><mat-option value="PRODUCTO_TERMINADO">Producto terminado</mat-option>
            </mat-select>
          </mat-form-field>
        }
        @if (error()) { <p class="falta" role="alert">{{ error() }}</p> }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="f.invalid">Guardar</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class ProductoDialog {
  private ref = inject(MatDialogRef<ProductoDialog, Producto>);
  private api = inject(Api);
  store = inject(EmpresaStore);
  error = signal('');
  f = inject(FormBuilder).nonNullable.group({
    codigo: ['', Validators.required], nombre: ['', Validators.required], unidad: ['UND'],
    tipo: [this.store.empresa()?.actividad === 'INDUSTRIAL' ? 'MATERIA_PRIMA' : 'MERCADERIA'],
  });
  guardar() {
    this.api.post<Producto>('/productos', this.f.getRawValue()).subscribe({ next: (p) => this.ref.close(p), error: (e) => this.error.set(errorDe(e).mensaje) });
  }
}
