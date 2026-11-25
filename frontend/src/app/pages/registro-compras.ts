import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Api, errorDe } from '../core/api';
import { Auth } from '../core/auth';
import { EmpresaStore } from '../core/empresa';
import { hoy, primerDiaMes, soles } from '../core/util';
import { AsientoEditarDialog } from '../shared/asiento-editar-dialog';

interface FilaCompra {
  correlativo: string;
  periodo: string;
  fecha: string;
  vencimiento: string;
  tipo: string;
  serie: string;
  numero: string;
  tipoDoc: string;
  documento: string;
  nombre: string;
  base: number;
  igv: number;
  noGravada: number;
  total: number;
  asientoId?: number;
  asientoNumero?: number;
  glosa?: string;
  moneda: string;
  tc: number;
}

@Component({
  imports: [
    FormsModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatExpansionModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="pagina">
      <!-- ENCABEZADO SUNAT FORMATO 8.1 -->
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:16px 20px; margin-bottom:16px">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px">
          <div>
            <h1 style="margin:0 0 6px; font-size:20px; color:#1e293b; font-weight:800; letter-spacing:0.5px">
              FORMATO 8.1: REGISTRO DE COMPRAS
            </h1>
            <div style="display:flex; flex-direction:column; gap:3px; font-size:13px; color:#475569">
              <div><strong>PERIODO:</strong> {{ periodoTexto() }}</div>
              <div><strong>RUC:</strong> {{ store.empresa()?.ruc || '—' }}</div>
              <div><strong>APELLIDOS Y NOMBRES, DENOMINACIÓN O RAZÓN SOCIAL:</strong> {{ store.empresa()?.razonSocial || 'EMPRESA GENERAL' }}</div>
            </div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap">
            <button mat-flat-button color="primary" type="button" (click)="formularioAbierto.set(!formularioAbierto())">
              <mat-icon>{{ formularioAbierto() ? 'close' : 'add' }}</mat-icon>
              {{ formularioAbierto() ? 'Cerrar Registro' : 'Registrar Compra (8.1)' }}
            </button>
            <button mat-stroked-button type="button" (click)="exportar('xlsx')">
              <mat-icon>table_view</mat-icon> Excel
            </button>
            <button mat-stroked-button type="button" (click)="exportar('pdf')">
              <mat-icon>picture_as_pdf</mat-icon> PDF
            </button>
          </div>
        </div>
      </div>

      <!-- FORMULARIO DE REGISTRO DE COMPRA -->
      @if (formularioAbierto()) {
        <div style="background:#fff; border:2px solid #6366f1; border-radius:8px; padding:18px 20px; margin-bottom:20px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)">
          <h2 style="margin:0 0 14px; font-size:16px; color:#4338ca; display:flex; align-items:center; gap:8px">
            <mat-icon>shopping_bag</mat-icon> Nueva Compra (Formato 8.1 SUNAT) · Registro de Comprobante
          </h2>
          <form [formGroup]="f" (ngSubmit)="guardarCompra()">
            <div class="fila" style="gap:12px; flex-wrap:wrap">
              <mat-form-field style="width:140px"><mat-label>Fecha Emisión</mat-label>
                <input matInput type="date" formControlName="fecha" />
              </mat-form-field>
              <mat-form-field style="width:140px"><mat-label>Fecha Vence</mat-label>
                <input matInput type="date" formControlName="vencimiento" />
              </mat-form-field>
              <mat-form-field style="width:140px"><mat-label>Tipo Comprobante</mat-label>
                <mat-select formControlName="tipoComprobante">
                  <mat-option value="01">01 Factura</mat-option>
                  <mat-option value="03">03 Boleta</mat-option>
                  <mat-option value="14">14 Recibo Servicio Público</mat-option>
                  <mat-option value="02">02 Recibo por Honorarios</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field style="width:100px"><mat-label>Serie</mat-label>
                <input matInput formControlName="serie" placeholder="F001" style="text-transform:uppercase" />
              </mat-form-field>
              <mat-form-field style="width:130px"><mat-label>Número</mat-label>
                <input matInput formControlName="numero" placeholder="00012345" />
              </mat-form-field>
              <mat-form-field style="width:140px"><mat-label>Condición</mat-label>
                <mat-select formControlName="condicion">
                  <mat-option value="CONTADO_EFECTIVO">Contado Efectivo</mat-option>
                  <mat-option value="CONTADO_BANCO">Contado Banco</mat-option>
                  <mat-option value="CREDITO">Crédito</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- PROVEEDOR CON AUTO-COMPLETADO SUNAT / RENIEC -->
            <div class="fila" style="gap:12px; align-items:center; flex-wrap:wrap; margin-top:4px">
              <mat-form-field style="width:100px"><mat-label>Tipo Doc.</mat-label>
                <mat-select formControlName="tipoDocTercero">
                  <mat-option value="RUC">6 - RUC</mat-option>
                  <mat-option value="DNI">1 - DNI</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field style="width:170px"><mat-label>N.º Documento Proveedor</mat-label>
                <input matInput formControlName="documentoTercero" (keyup.enter)="consultarProveedor()" placeholder="20123456789" />
              </mat-form-field>
              <button mat-flat-button color="primary" type="button" (click)="consultarProveedor()" [disabled]="consultando()" style="height:48px">
                @if (consultando()) { <mat-spinner diameter="18"></mat-spinner> } @else { <span><mat-icon>search</mat-icon> Consultar SUNAT</span> }
              </button>
              <mat-form-field style="flex:1; min-width:260px"><mat-label>Razón Social / Proveedor</mat-label>
                <input matInput formControlName="nombreTercero" />
              </mat-form-field>
            </div>

            <!-- MONTOS -->
            <div class="fila" style="gap:12px; align-items:center; flex-wrap:wrap; margin-top:4px">
              <mat-form-field style="width:160px"><mat-label>Base Imponible (S/)</mat-label>
                <input matInput type="number" step="0.01" min="0" formControlName="base" (input)="calcularDesdeBase()" />
              </mat-form-field>
              <mat-form-field style="width:150px"><mat-label>IGV 18% (S/)</mat-label>
                <input matInput type="number" step="0.01" min="0" formControlName="igv" (input)="recalcularTotal()" />
              </mat-form-field>
              <mat-form-field style="width:150px"><mat-label>No Gravada (S/)</mat-label>
                <input matInput type="number" step="0.01" min="0" formControlName="noGravada" (input)="recalcularTotal()" />
              </mat-form-field>
              <mat-form-field style="width:170px"><mat-label>Total Importe (S/)</mat-label>
                <input matInput type="number" step="0.01" min="0" formControlName="total" (input)="calcularDesdeTotal()" style="font-weight:bold" />
              </mat-form-field>
            </div>

            @if (msgConsulta()) { <p style="margin:4px 0 10px; font-size:12px; color:#15803d; font-weight:600">{{ msgConsulta() }}</p> }
            @if (errorForm()) { <p class="falta" role="alert" style="margin:4px 0 10px">{{ errorForm() }}</p> }

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px">
              <button mat-button type="button" (click)="formularioAbierto.set(false)">Cancelar</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="f.invalid || guardando()">
                <mat-icon>check</mat-icon> Registrar Comprobante de Compra
              </button>
            </div>
          </form>
        </div>
      }

      <!-- FILTROS DE PERÍODO -->
      <div class="fila" style="align-items:center; margin-bottom:12px; gap:12px">
        <mat-form-field style="width:150px"><mat-label>Desde</mat-label><input matInput type="date" [(ngModel)]="desde" (change)="cargar()" /></mat-form-field>
        <mat-form-field style="width:150px"><mat-label>Hasta</mat-label><input matInput type="date" [(ngModel)]="hasta" (change)="cargar()" /></mat-form-field>
        <button mat-stroked-button (click)="cargar()"><mat-icon>refresh</mat-icon> Actualizar</button>
      </div>

      <!-- TABLA OFICIAL FORMATO 8.1 CON ENCABEZADOS SUNAT -->
      <div class="scroll" style="box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08); border-radius: 4px; overflow: hidden">
        <table class="t tabla-cuadricula">
          <thead>
            <tr>
              <th rowspan="2">N.º CORRELATIVO</th>
              <th rowspan="2">FECHA DE EMISIÓN</th>
              <th rowspan="2">FECHA VENC.</th>
              <th colspan="3">COMPROBANTE DE PAGO</th>
              <th colspan="3">INFORMACIÓN DEL PROVEEDOR</th>
              <th colspan="2">ADQUISICIONES GRAVADAS</th>
              <th rowspan="2" class="num">VALOR NO GRAVADO</th>
              <th rowspan="2" class="num">IMPORTE TOTAL</th>
              <th rowspan="2">ESTADO DIARIO</th>
            </tr>
            <tr>
              <th>TIPO</th>
              <th>SERIE</th>
              <th>NÚMERO</th>
              <th>TIPO DOC.</th>
              <th>N.º DOCUMENTO</th>
              <th>APELLIDOS Y NOMBRES O RAZÓN SOCIAL</th>
              <th class="num">BASE IMPONIBLE</th>
              <th class="num">IGV</th>
            </tr>
          </thead>
          <tbody>
            @for (r of filas(); track r.correlativo) {
              <tr>
                <td style="text-align:center; font-weight:700">{{ r.correlativo }}</td>
                <td style="text-align:center">{{ r.fecha }}</td>
                <td style="text-align:center">{{ r.vencimiento || '—' }}</td>
                <td style="text-align:center"><code>{{ r.tipo }}</code></td>
                <td style="text-align:center; font-weight:600">{{ r.serie }}</td>
                <td style="text-align:center; font-weight:600">{{ r.numero }}</td>
                <td style="text-align:center">{{ r.tipoDoc }}</td>
                <td><code>{{ r.documento }}</code></td>
                <td style="font-weight:500">{{ r.nombre }}</td>
                <td class="num">{{ soles(r.base) }}</td>
                <td class="num">{{ soles(r.igv) }}</td>
                <td class="num">{{ soles(r.noGravada) }}</td>
                <td class="num" style="font-weight:800; color:#0f172a">{{ soles(r.total) }}</td>
                <td style="text-align:center">
                  @if (r.asientoId) {
                    <span style="background:#dcfce7; color:#15803d; font-size:11px; padding:3px 8px; border-radius:12px; font-weight:600; border:1px solid #86efac">
                      Contabilizado (#{{ r.asientoNumero || r.asientoId }})
                    </span>
                  } @else {
                    <span style="background:#fef3c7; color:#b45309; font-size:11px; padding:3px 8px; border-radius:12px; font-weight:600; border:1px solid #fde68a">
                      Pendiente en Diario
                    </span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="13" class="muted" style="text-align:center; padding:24px; font-weight:500">
                  No hay comprobantes de compra registrados en este periodo. Usa el botón "Registrar Compra" para agregar uno.
                </td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr>
              <td colspan="9" style="text-align:right">TOTALES:</td>
              <td class="num">{{ soles(totales().base) }}</td>
              <td class="num">{{ soles(totales().igv) }}</td>
              <td class="num">{{ soles(totales().noGravada) }}</td>
              <td class="num">{{ soles(totales().total) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `,
})
export class RegistroComprasComponent implements OnInit {
  private api = inject(Api);
  private dialog = inject(MatDialog);
  auth = inject(Auth);
  store = inject(EmpresaStore);
  soles = soles;

  desde = primerDiaMes();
  hasta = hoy();
  filas = signal<FilaCompra[]>([]);
  totales = signal({ base: 0, igv: 0, noGravada: 0, total: 0 });

  formularioAbierto = signal(false);
  consultando = signal(false);
  guardando = signal(false);
  msgConsulta = signal('');
  errorForm = signal('');

  fb = inject(FormBuilder).nonNullable;
  f = this.fb.group({
    fecha: [hoy(), Validators.required],
    vencimiento: [''],
    tipoComprobante: ['01', Validators.required],
    serie: ['F001', [Validators.required, Validators.maxLength(4)]],
    numero: ['', [Validators.required, Validators.pattern(/^\d{1,8}$/)]],
    condicion: ['CONTADO_EFECTIVO', Validators.required],
    tipoDocTercero: ['RUC', Validators.required],
    documentoTercero: ['', Validators.required],
    nombreTercero: ['', Validators.required],
    base: [0, [Validators.required, Validators.min(0.01)]],
    igv: [0, Validators.required],
    noGravada: [0],
    total: [0, [Validators.required, Validators.min(0.01)]],
  });

  periodoTexto = computed(() => {
    return `${this.desde} al ${this.hasta}`;
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.get<any>('/reportes/registro-compras', { desde: this.desde, hasta: this.hasta }).subscribe({
      next: (res) => {
        this.filas.set(res.filas || []);
        if (res.totales) this.totales.set(res.totales);
      },
    });
  }

  exportar(f: 'xlsx' | 'pdf') {
    this.api.descargar('/reportes/registro-compras', { desde: this.desde, hasta: this.hasta, formato: f }, `registro-compras-8.1.${f}`);
  }

  consultarProveedor() {
    const doc = this.f.controls.documentoTercero.value.trim();
    const tipo = this.f.controls.tipoDocTercero.value;
    if (!doc) return;
    this.consultando.set(true);
    this.msgConsulta.set('');
    this.errorForm.set('');

    const url = tipo === 'RUC' ? `/terceros/consulta-ruc/${doc}` : `/terceros/consulta-dni/${doc}`;
    this.api.get<any>(url).subscribe({
      next: (res) => {
        this.consultando.set(false);
        const nombre = tipo === 'RUC'
          ? (res.razonSocial || res.nombre || '')
          : (res.nombreCompleto || res.nombre || [res.nombres, res.apellidoPaterno, res.apellidoMaterno].filter(Boolean).join(' '));
        this.f.patchValue({ nombreTercero: nombre || '' });
        const detalle = tipo === 'RUC' && res.estado ? ` [SUNAT: ${res.estado} - ${res.condicion || 'HABIDO'}]` : ' [RENIEC: Válido]';
        this.msgConsulta.set(`✓ Proveedor identificado: ${nombre}${detalle}`);
      },
      error: (e) => {
        this.consultando.set(false);
        this.errorForm.set(errorDe(e).mensaje || 'No se pudo obtener información del proveedor');
      },
    });
  }

  calcularDesdeBase() {
    const base = Number(this.f.controls.base.value) || 0;
    const igv = Math.round(base * 0.18 * 100) / 100;
    const noGrav = Number(this.f.controls.noGravada.value) || 0;
    const total = Math.round((base + igv + noGrav) * 100) / 100;
    this.f.patchValue({ igv, total }, { emitEvent: false });
  }

  calcularDesdeTotal() {
    const total = Number(this.f.controls.total.value) || 0;
    const base = Math.round((total / 1.18) * 100) / 100;
    const igv = Math.round((total - base) * 100) / 100;
    this.f.patchValue({ base, igv }, { emitEvent: false });
  }

  recalcularTotal() {
    const base = Number(this.f.controls.base.value) || 0;
    const igv = Number(this.f.controls.igv.value) || 0;
    const noGrav = Number(this.f.controls.noGravada.value) || 0;
    const total = Math.round((base + igv + noGrav) * 100) / 100;
    this.f.patchValue({ total }, { emitEvent: false });
  }

  guardarCompra() {
    if (this.f.invalid) return;
    this.guardando.set(true);
    this.errorForm.set('');

    const v = this.f.getRawValue();

    // Guardar el comprobante auxiliar en Registro de Compras 8.1 (sin asiento ni glosa contable)
    this.api.post<any>('/documentos', {
      sentido: 'COMPRA',
      tipo: v.tipoComprobante,
      serie: v.serie.trim().toUpperCase(),
      numero: v.numero.trim(),
      tipoDocTercero: v.tipoDocTercero,
      documentoTercero: v.documentoTercero.trim(),
      nombreTercero: v.nombreTercero.trim(),
      fecha: v.fecha,
      vencimiento: v.vencimiento || undefined,
      base: Number(v.base),
      igv: Number(v.igv),
      total: Number(v.total),
      condicion: v.condicion,
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.f.reset({
          fecha: hoy(),
          tipoComprobante: '01',
          serie: 'F001',
          condicion: 'CONTADO_EFECTIVO',
          tipoDocTercero: 'RUC',
          documentoTercero: '',
          nombreTercero: '',
          base: 0,
          igv: 0,
          noGravada: 0,
          total: 0,
        });
        this.msgConsulta.set('');
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.errorForm.set(errorDe(e).mensaje);
      },
    });
  }

  verModificarAsiento(asientoId: number) {
    this.dialog.open(AsientoEditarDialog, {
      data: { id: asientoId },
      width: '780px',
    }).afterClosed().subscribe((res) => {
      if (res) this.cargar();
    });
  }
}
