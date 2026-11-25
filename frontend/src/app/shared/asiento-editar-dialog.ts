import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Api, errorDe } from '../core/api';
import { soles } from '../core/util';
import { SelectorCuenta } from './selector-cuenta';

export interface LineaEditable {
  orden: number;
  cuenta: string;
  nombre?: string;
  debe: number;
  haber: number;
  etapa?: string;
  glosa?: string;
}

export interface AsientoDetalle {
  id: number;
  numero: number;
  fecha: string;
  glosa: string;
  operacion: string;
  estado: string;
  lineas: LineaEditable[];
}

@Component({
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, SelectorCuenta],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle; margin-right:6px; color:#4f46e5">edit_note</mat-icon>
      Modificar Asiento Contable N.º {{ asiento()?.numero ?? data.id }}
    </h2>
    <mat-dialog-content style="min-width:620px; max-width:90vw;">
      @if (cargando()) {
        <p class="muted">Cargando asiento...</p>
      } @else if (asiento(); as a) {
        <div class="fila" style="gap:16px; margin-top:8px;">
          <mat-form-field style="width:160px">
            <mat-label>Fecha contable</mat-label>
            <input matInput type="date" [(ngModel)]="fecha" />
          </mat-form-field>
          <mat-form-field style="flex:1">
            <mat-label>Glosa general del asiento</mat-label>
            <input matInput [(ngModel)]="glosa" placeholder="Por la compra / venta..." />
          </mat-form-field>
        </div>

        <div style="margin: 12px 0 6px; display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0; font-size:14px; font-weight:600; color:#1e293b">Líneas del Asiento (Partida Doble)</h3>
          <button mat-stroked-button color="primary" type="button" (click)="agregarLinea()">
            <mat-icon>add</mat-icon> Agregar Línea
          </button>
        </div>

        <div class="scroll" style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden">
          <table class="t" style="margin:0">
            <thead style="background:#f8fafc">
              <tr>
                <th style="width:40px">#</th>
                <th style="min-width:240px">Cuenta Contable</th>
                <th class="num" style="width:130px">Debe (S/)</th>
                <th class="num" style="width:130px">Haber (S/)</th>
                <th style="width:50px"></th>
              </tr>
            </thead>
            <tbody>
              @for (l of lineas(); track $index; let idx = $index) {
                <tr>
                  <td>{{ idx + 1 }}</td>
                  <td>
                    <app-selector-cuenta [ngModel]="l.cuenta" (ngModelChange)="actualizarCuenta(l, $event)" />
                  </td>
                  <td>
                    <input matInput type="number" step="0.01" min="0" [(ngModel)]="l.debe" (ngModelChange)="onMontoChange(l, 'debe')" class="num-input" />
                  </td>
                  <td>
                    <input matInput type="number" step="0.01" min="0" [(ngModel)]="l.haber" (ngModelChange)="onMontoChange(l, 'haber')" class="num-input" />
                  </td>
                  <td style="text-align:center">
                    <button mat-icon-button color="warn" type="button" (click)="eliminarLinea(idx)" [disabled]="lineas().length <= 2">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
            <tfoot style="background:#f1f5f9; font-weight:bold">
              <tr>
                <td colspan="2" style="text-align:right">TOTALES:</td>
                <td class="num">{{ soles(totalDebe()) }}</td>
                <td class="num">{{ soles(totalHaber()) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            @if (cuadra()) {
              <span style="color:#16a34a; font-weight:600; display:inline-flex; align-items:center; gap:4px">
                <mat-icon style="font-size:18px; width:18px; height:18px">check_circle</mat-icon> Asiento Cuadrado (Debe = Haber)
              </span>
            } @else {
              <span style="color:#dc2626; font-weight:600; display:inline-flex; align-items:center; gap:4px">
                <mat-icon style="font-size:18px; width:18px; height:18px">error</mat-icon> Descuadre: S/ {{ diferencia().toFixed(2) }}
              </span>
            }
          </div>
          @if (error()) {
            <p class="falta" role="alert" style="margin:0">{{ error() }}</p>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="guardar()" [disabled]="!cuadra() || guardando() || cargando()">
        <mat-icon>save</mat-icon> Guardar Cambios
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .num-input {
      text-align: right;
      font-family: monospace;
      font-weight: 600;
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 8px;
    }
    .num-input:focus {
      outline: none;
      border-color: #4f46e5;
    }
  `],
})
export class AsientoEditarDialog implements OnInit {
  data = inject<{ id: number; asiento?: AsientoDetalle }>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<AsientoEditarDialog, any>);
  private api = inject(Api);
  soles = soles;

  cargando = signal(true);
  guardando = signal(false);
  error = signal('');
  asiento = signal<AsientoDetalle | null>(null);

  fecha = '';
  glosa = '';
  lineas = signal<LineaEditable[]>([]);

  totalDebe = computed(() => {
    return Math.round(this.lineas().reduce((acc, l) => acc + (Number(l.debe) || 0), 0) * 100) / 100;
  });

  totalHaber = computed(() => {
    return Math.round(this.lineas().reduce((acc, l) => acc + (Number(l.haber) || 0), 0) * 100) / 100;
  });

  diferencia = computed(() => {
    return Math.abs(Math.round((this.totalDebe() - this.totalHaber()) * 100) / 100);
  });

  cuadra = computed(() => this.diferencia() === 0 && this.totalDebe() > 0);

  ngOnInit() {
    if (this.data.asiento) {
      this.cargarDatos(this.data.asiento);
      this.cargando.set(false);
    } else {
      this.api.get<AsientoDetalle>(`/asientos/${this.data.id}`).subscribe({
        next: (a) => {
          this.cargarDatos(a);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(errorDe(e).mensaje);
          this.cargando.set(false);
        },
      });
    }
  }

  private cargarDatos(a: AsientoDetalle) {
    this.asiento.set(a);
    this.fecha = a.fecha;
    this.glosa = a.glosa;
    this.lineas.set(a.lineas.map((l) => ({ ...l, debe: Number(l.debe) || 0, haber: Number(l.haber) || 0 })));
  }

  actualizarCuenta(l: LineaEditable, codigo: string) {
    l.cuenta = codigo;
  }

  onMontoChange(l: LineaEditable, lado: 'debe' | 'haber') {
    if (lado === 'debe' && l.debe > 0) l.haber = 0;
    if (lado === 'haber' && l.haber > 0) l.debe = 0;
  }

  agregarLinea() {
    this.lineas.update((ls) => [
      ...ls,
      { orden: ls.length + 1, cuenta: '101', debe: 0, haber: 0, etapa: 'OTRO' },
    ]);
  }

  eliminarLinea(idx: number) {
    this.lineas.update((ls) => ls.filter((_, i) => i !== idx));
  }

  guardar() {
    if (!this.cuadra()) {
      this.error.set('El asiento no cuadra: Debe y Haber deben ser idénticos.');
      return;
    }
    this.guardando.set(true);
    this.error.set('');

    const body = {
      fecha: this.fecha,
      glosa: this.glosa,
      lineas: this.lineas().map((l) => ({
        cuenta: l.cuenta,
        debe: Number(l.debe) || 0,
        haber: Number(l.haber) || 0,
        etapa: l.etapa,
        glosa: l.glosa,
      })),
    };

    const id = this.asiento()?.id ?? this.data.id;
    this.api.patch(`/asientos/${id}`, body).subscribe({
      next: (res) => this.ref.close(res),
      error: (e) => {
        this.guardando.set(false);
        this.error.set(errorDe(e).mensaje);
      },
    });
  }
}
