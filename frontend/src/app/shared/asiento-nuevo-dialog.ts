import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Api, errorDe } from '../core/api';
import { soles } from '../core/util';

export interface DatosPrellenadoAsiento {
  documentoId?: number;
  codigoLibro?: string;
  documentoSustentatorio?: string;
  glosa?: string;
  fecha?: string;
  lineas?: Array<{ cuentaCodigo: string; debe: number; haber: number }>;
}

interface CuentaItem {
  codigo: string;
  nombre: string;
  denominacion: string;
  codigoPadre: string;
  esImputable: boolean;
}

@Component({
  selector: 'app-asiento-nuevo-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title style="display:flex; align-items:center; gap:8px">
      <mat-icon color="primary">menu_book</mat-icon> {{ data?.documentoId ? 'Generar y Editar Asiento desde Comprobante' : 'Registrar Asiento en Libro Diario (Formato 5.1)' }}
    </h2>
    <mat-dialog-content style="max-height: 80vh">
      @if (data?.documentoId) {
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:0.85rem; color:#1e40af; display:flex; align-items:center; gap:8px">
          <mat-icon style="font-size:18px; width:18px; height:18px">info</mat-icon>
          <span>Asiento precargado desde comprobante <strong>{{ data?.documentoSustentatorio }}</strong>. Puede modificar libremente cuentas, montos y glosa antes de guardar.</span>
        </div>
      }
      <form [formGroup]="form">
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-top:8px">
          <mat-form-field appearance="outline">
            <mat-label>Fecha de Operación</mat-label>
            <input matInput type="date" formControlName="fecha" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Libro / Registro (Tabla 8)</mat-label>
            <mat-select formControlName="codigoLibro">
              <mat-option value="05">05 - Libro Diario</mat-option>
              <mat-option value="01">01 - Libro Caja y Bancos</mat-option>
              <mat-option value="08">08 - Registro de Compras</mat-option>
              <mat-option value="14">14 - Registro de Ventas</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Doc. Sustentatorio (Opcional)</mat-label>
            <input matInput formControlName="documentoSustentatorio" placeholder="Ej. F001-00012345" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Glosa o Descripción del Asiento / Bloque</mat-label>
          <textarea matInput formControlName="glosa" rows="2" placeholder="Ej. Por la compra de suministros según factura..."></textarea>
        </mat-form-field>

        <h3 style="margin: 16px 0 8px; display:flex; justify-content:space-between; align-items:center">
          <span>Movimientos Contables (Partida Doble)</span>
          <button mat-stroked-button color="primary" type="button" (click)="agregarLinea()">
            <mat-icon>add</mat-icon> Agregar Cuenta
          </button>
        </h3>

        <div style="display:flex; flex-direction:column; gap:8px" formArrayName="lineas">
          @for (lin of lineasArray.controls; track $index) {
            <div [formGroupName]="$index" style="display:flex; gap:8px; align-items:center; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0">
              <!-- Cuenta Selector -->
              <mat-form-field appearance="outline" style="flex:2; margin-bottom:-1.25em">
                <mat-label>Cuenta PCGE</mat-label>
                <input matInput formControlName="cuentaCodigo" (input)="onCuentaChange($index)" placeholder="Ej. 101, 1041, 6011, 40111, 4212" />
              </mat-form-field>

              <!-- Nombre y Padre -->
              <div style="flex:3; font-size:0.825rem; line-height:1.2; overflow:hidden">
                <strong style="color:#0f172a">{{ getCuentaNombre($index) }}</strong>
                @if (getCuentaPadre($index)) {
                  <div style="color:#2563eb; font-size:0.75rem; margin-top:2px">
                    Jerarquía: Cuenta {{ getCuentaPadre($index) }}
                  </div>
                }
              </div>

              <!-- Debe -->
              <mat-form-field appearance="outline" style="width:130px; margin-bottom:-1.25em">
                <mat-label>Debe (S/)</mat-label>
                <input matInput type="number" step="0.01" formControlName="debe" (input)="calcularTotales()" />
              </mat-form-field>

              <!-- Haber -->
              <mat-form-field appearance="outline" style="width:130px; margin-bottom:-1.25em">
                <mat-label>Haber (S/)</mat-label>
                <input matInput type="number" step="0.01" formControlName="haber" (input)="calcularTotales()" />
              </mat-form-field>

              <!-- Eliminar -->
              @if (lineasArray.length > 2) {
                <button mat-icon-button color="warn" type="button" (click)="eliminarLinea($index)">
                  <mat-icon>delete</mat-icon>
                </button>
              }
            </div>
          }
        </div>

        <!-- Totales y Cuadre -->
        <div style="margin-top:16px; padding:12px 16px; background:#f1f5f9; border-radius:8px; display:flex; justify-content:space-between; align-items:center; font-weight:600">
          <div>
            <span>Total Debe: <strong>S/ {{ soles(totalDebe()) }}</strong></span>
            <span style="margin: 0 16px">|</span>
            <span>Total Haber: <strong>S/ {{ soles(totalHaber()) }}</strong></span>
          </div>
          <div>
            @if (cuadra()) {
              <span class="cuadra" style="padding:4px 12px; font-size:0.85rem">
                <mat-icon style="font-size:16px; width:16px; height:16px">check_circle</mat-icon> CUADRADO
              </span>
            } @else {
              <span class="nocuadra" style="padding:4px 12px; font-size:0.85rem">
                <mat-icon style="font-size:16px; width:16px; height:16px">warning</mat-icon> DIFERENCIA: S/ {{ soles(diferencia()) }}
              </span>
            }
          </div>
        </div>

        @if (error()) {
          <div class="falta" style="margin-top:12px; padding:8px 12px; background:#fee2e2; border-radius:6px">
            {{ error() }}
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:12px 24px; gap:8px">
      <button mat-button mat-dialog-close>Cancelar</button>
      @if (!data?.documentoId) {
        <button mat-stroked-button color="primary" type="button" (click)="guardar(true)" [disabled]="!cuadra() || guardando()">
          Guardar y Continuar Siguiente Asiento
        </button>
      }
      <button mat-flat-button color="primary" type="button" (click)="guardar(false)" [disabled]="!cuadra() || guardando()">
        Guardar Asiento
      </button>
    </mat-dialog-actions>
  `,
})
export class AsientoNuevoDialog implements OnInit {
  data = inject<DatosPrellenadoAsiento | null>(MAT_DIALOG_DATA, { optional: true });
  private fb = inject(FormBuilder);
  private api = inject(Api);
  private ref = inject(MatDialogRef<AsientoNuevoDialog>);
  private snack = inject(MatSnackBar);

  cuentas = signal<Map<string, CuentaItem>>(new Map());
  cuentasPadre = signal<Map<string, string>>(new Map());
  totalDebe = signal(0);
  totalHaber = signal(0);
  cuadra = signal(false);
  diferencia = signal(0);
  error = signal('');
  guardando = signal(false);
  soles = soles;

  form: FormGroup = this.fb.group({
    fecha: [new Date().toISOString().slice(0, 10), Validators.required],
    codigoLibro: ['05', Validators.required],
    documentoSustentatorio: [''],
    glosa: ['', Validators.required],
    lineas: this.fb.array([]),
  });

  get lineasArray(): FormArray {
    return this.form.get('lineas') as FormArray;
  }

  ngOnInit() {
    this.cargarCatalogoCuentas();

    if (this.data) {
      if (this.data.fecha) this.form.patchValue({ fecha: this.data.fecha });
      if (this.data.codigoLibro) this.form.patchValue({ codigoLibro: this.data.codigoLibro });
      if (this.data.documentoSustentatorio) this.form.patchValue({ documentoSustentatorio: this.data.documentoSustentatorio });
      if (this.data.glosa) this.form.patchValue({ glosa: this.data.glosa });

      if (this.data.lineas && this.data.lineas.length > 0) {
        for (const l of this.data.lineas) {
          this.agregarLineaConDatos(l.cuentaCodigo, l.debe, l.haber);
        }
        this.calcularTotales();
      } else {
        this.agregarLinea();
        this.agregarLinea();
      }
    } else {
      this.agregarLinea();
      this.agregarLinea();
    }
  }

  cargarCatalogoCuentas() {
    this.api.get<any[]>('/cuentas').subscribe((lista) => {
      const map = new Map<string, CuentaItem>();
      const padres = new Map<string, string>();

      for (const c of lista) {
        map.set(c.codigo, {
          codigo: c.codigo,
          nombre: c.nombre,
          denominacion: c.denominacion || c.nombre,
          codigoPadre: c.codigoPadre || (c.codigo.length > 2 ? c.codigo.substring(0, 2) : ''),
          esImputable: c.esImputable !== undefined ? c.esImputable : (c.ultimoNivel !== undefined ? c.ultimoNivel : true),
        });
        if (c.codigo.length === 2) {
          padres.set(c.codigo, c.codigo + ' - ' + (c.denominacion || c.nombre));
        }
      }
      this.cuentas.set(map);
      this.cuentasPadre.set(padres);
    });
  }

  agregarLinea() {
    const g = this.fb.group({
      cuentaCodigo: ['', Validators.required],
      debe: [0, [Validators.min(0)]],
      haber: [0, [Validators.min(0)]],
      documentoSustentatorio: [''],
      glosa: [''],
    });
    this.lineasArray.push(g);
  }

  agregarLineaConDatos(cuentaCodigo: string, debe: number, haber: number) {
    const g = this.fb.group({
      cuentaCodigo: [cuentaCodigo, Validators.required],
      debe: [debe, [Validators.min(0)]],
      haber: [haber, [Validators.min(0)]],
      documentoSustentatorio: [''],
      glosa: [''],
    });
    this.lineasArray.push(g);
  }

  eliminarLinea(idx: number) {
    if (this.lineasArray.length > 2) {
      this.lineasArray.removeAt(idx);
      this.calcularTotales();
    }
  }

  onCuentaChange(idx: number) {
    const cod = (this.lineasArray.at(idx).get('cuentaCodigo')?.value || '').trim();
    if (cod.length >= 2) {
      this.calcularTotales();
    }
  }

  getCuentaNombre(idx: number): string {
    const cod = (this.lineasArray.at(idx).get('cuentaCodigo')?.value || '').trim();
    const c = this.cuentas().get(cod);
    return c ? c.denominacion : (cod ? 'Cuenta ' + cod : 'Seleccione o ingrese código...');
  }

  getCuentaPadre(idx: number): string {
    const cod = (this.lineasArray.at(idx).get('cuentaCodigo')?.value || '').trim();
    if (cod.length > 2) {
      const padreCod = cod.substring(0, 2);
      return this.cuentasPadre().get(padreCod) || padreCod;
    }
    return '';
  }

  calcularTotales() {
    let d = 0;
    let h = 0;
    for (let i = 0; i < this.lineasArray.length; i++) {
      const valD = parseFloat(this.lineasArray.at(i).get('debe')?.value) || 0;
      const valH = parseFloat(this.lineasArray.at(i).get('haber')?.value) || 0;
      d += valD;
      h += valH;
    }
    d = Math.round(d * 100) / 100;
    h = Math.round(h * 100) / 100;

    this.totalDebe.set(d);
    this.totalHaber.set(h);
    this.cuadra.set(d === h && d > 0);
    this.diferencia.set(Math.abs(Math.round((d - h) * 100) / 100));
  }

  guardar(continuarSiguiente: boolean) {
    if (!this.cuadra()) {
      this.error.set('El asiento no cumple con la partida doble: Debe != Haber');
      return;
    }

    this.guardando.set(true);
    this.error.set('');

    const raw = this.form.getRawValue();
    const body: any = {
      fecha: raw.fecha,
      codigoLibro: raw.codigoLibro,
      documentoSustentatorio: raw.documentoSustentatorio,
      documentoId: this.data?.documentoId,
      glosa: raw.glosa,
      lineas: raw.lineas.map((l: any) => ({
        cuentaCodigo: l.cuentaCodigo.trim(),
        debe: parseFloat(l.debe) || 0,
        haber: parseFloat(l.haber) || 0,
        documentoSustentatorio: l.documentoSustentatorio || raw.documentoSustentatorio,
        glosa: l.glosa || raw.glosa,
      })),
    };

    this.api.post('/asientos', body).subscribe({
      next: (resp: any) => {
        this.guardando.set(false);
        this.snack.open(`Asiento N° ${resp.numero || ''} guardado con éxito`, 'OK', { duration: 3000 });

        if (continuarSiguiente) {
          this.form.patchValue({
            glosa: '',
            documentoSustentatorio: '',
          });
          while (this.lineasArray.length > 0) {
            this.lineasArray.removeAt(0);
          }
          this.agregarLinea();
          this.agregarLinea();
          this.calcularTotales();
        } else {
          this.ref.close(true);
        }
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(errorDe(e).mensaje);
      },
    });
  }
}

