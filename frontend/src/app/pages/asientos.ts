import { CommonModule, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Api, errorDe } from '../core/api';
import { Auth } from '../core/auth';
import { EmpresaStore } from '../core/empresa';
import { soles } from '../core/util';
import { AsientoEditarDialog } from '../shared/asiento-editar-dialog';
import { AsientoNuevoDialog } from '../shared/asiento-nuevo-dialog';
import { GenerarAsientoDialog } from '../shared/generar-asiento-dialog';

interface LineaVista {
  id: number;
  orden: number;
  codigoLibro?: string;
  correlativo?: string;
  documentoSustentatorio?: string;
  cuentaCodigo: string;
  cuentaNombre: string;
  denominacion?: string;
  cuentaPadreCodigo?: string;
  cuentaPadreNombre?: string;
  debe: number;
  haber: number;
  etapa?: string;
  terceroNombre?: string;
  glosa?: string;
}

interface AsientoVista {
  id: number;
  numero: number;
  fecha: string;
  periodo: string;
  operacion: string;
  glosa: string;
  codigoLibro?: string;
  documentoSustentatorio?: string;
  estado: string;
  motivoAnulacion?: string;
  usuario?: string;
  lineas: LineaVista[];
}

interface GrupoCuentaPadre {
  padreCodigo: string;
  padreNombre: string;
  subcuentas: LineaVista[];
}

interface BloqueAsiento {
  asiento: AsientoVista;
  correlativoStr: string;
  codigoLibro: string;
  docSust: string;
  grupos: GrupoCuentaPadre[];
  totalDebe: number;
  totalHaber: number;
  cuadra: boolean;
}

@Component({
  selector: 'app-asientos',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="pagina libro-diario-container">
      <!-- Toolbar Superior / Acciones -->
      <div class="header-acciones no-print">
        <div>
          <h1>Libro Diario (Formato SUNAT 5.1)</h1>
          <p class="muted">Registro estructurado de movimientos contables con jerarquía PCGE de 2 dígitos y glosa por asiento.</p>
        </div>
        <div class="botones-toolbar">
          <button mat-stroked-button color="primary" type="button" (click)="imprimir()">
            <mat-icon>print</mat-icon> Imprimir Formato 5.1
          </button>
          @if (auth.registra()) {
            <button mat-flat-button type="button" (click)="abrirGenerarDesdeComprobantes()" style="background:#0284c7; color:white">
              <mat-icon>receipt_long</mat-icon> Generar Asiento desde Compras/Ventas
            </button>
            <button mat-flat-button color="primary" type="button" (click)="nuevoAsiento()">
              <mat-icon>add</mat-icon> Registrar Nuevo Asiento
            </button>
          }
        </div>
      </div>

      <!-- Filtros no imprimibles -->
      <div class="fila no-print filtros-box">
        <mat-form-field appearance="outline" class="angosto">
          <mat-label>Desde</mat-label>
          <input matInput type="date" [(ngModel)]="desde" (change)="cargar()" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="angosto">
          <mat-label>Hasta</mat-label>
          <input matInput type="date" [(ngModel)]="hasta" (change)="cargar()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Tipo de Operación</mat-label>
          <mat-select [(ngModel)]="operacion" (selectionChange)="cargar()">
            <mat-option value="">Todas las operaciones</mat-option>
            @for (o of operaciones; track o) { <mat-option [value]="o">{{ o }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Cabecera Oficial del Formato 5.1 SUNAT -->
      <div class="formato-sunat-header">
        <div class="titulo-formato">FORMATO 5.1: LIBRO DIARIO</div>
        <div class="datos-empresa-grid">
          <div><strong>PERÍODO:</strong> <span>{{ periodoDisplay() }}</span></div>
          <div><strong>RUC:</strong> <span>{{ store.empresa()?.ruc || '20000000001' }}</span></div>
          <div style="grid-column: span 2">
            <strong>APELLIDOS Y NOMBRES, DENOMINACIÓN O RAZÓN SOCIAL:</strong>
            <span>{{ store.empresa()?.razonSocial || 'EMPRESA GENERAL S.A.C.' }}</span>
          </div>
        </div>
      </div>

      <!-- Tabla Oficial del Libro Diario con Jerarquía PCGE -->
      <div class="scroll">
        <table class="t tabla-diario">
          <thead>
            <tr>
              <th style="width: 110px">CÓD. LIBRO (TABLA 8)</th>
              <th style="width: 90px">N.º CORREL.</th>
              <th style="width: 140px">DOC. SUSTENTATORIO</th>
              <th style="width: 110px">CÓD. CUENTA</th>
              <th>DENOMINACIÓN DE LA CUENTA (PCGE)</th>
              <th class="num" style="width: 130px">DEBE (S/)</th>
              <th class="num" style="width: 130px">HABER (S/)</th>
            </tr>
          </thead>
          <tbody>
            @for (b of bloques(); track b.asiento.id) {
              <!-- Separador de inicio de asiento -->
              <tr class="fila-inicio-asiento">
                <td colspan="7" class="asiento-header-bar">
                  <div style="display:flex; justify-content:space-between; align-items:center">
                    <span>
                      <strong>ASIENTO N.º {{ b.asiento.numero }}</strong> · Fecha: {{ b.asiento.fecha }} · Operación: {{ b.asiento.operacion }}
                      @if (b.asiento.estado === 'ANULADO') { <span class="badge-anulado">ANULADO</span> }
                    </span>
                    <span class="no-print">
                      @if (auth.contable() && b.asiento.estado === 'ACTIVO') {
                        <button mat-icon-button color="primary" matTooltip="Modificar Asiento" (click)="editar(b.asiento)">
                          <mat-icon style="font-size:18px">edit</mat-icon>
                        </button>
                      }
                    </span>
                  </div>
                </td>
              </tr>

              <!-- Grupos por Cuenta Principal (2 dígitos) -->
              @for (g of b.grupos; track g.padreCodigo) {
                <!-- 1. Fila de Encabezado de Cuenta Principal (2 dígitos en negrita, sin montos) -->
                <tr class="fila-cuenta-principal">
                  <td>{{ b.codigoLibro }}</td>
                  <td>{{ b.correlativoStr }}</td>
                  <td>{{ b.docSust }}</td>
                  <td class="cod-principal"><strong>{{ g.padreCodigo }}</strong></td>
                  <td class="denom-principal"><strong>{{ g.padreNombre | uppercase }}</strong></td>
                  <td class="num muted">—</td>
                  <td class="num muted">—</td>
                </tr>

                <!-- 2. Subcuentas o divisionarias imputables con Debe y Haber -->
                @for (sub of g.subcuentas; track sub.id) {
                  <tr class="fila-subcuenta">
                    <td>{{ b.codigoLibro }}</td>
                    <td>{{ b.correlativoStr }}</td>
                    <td>{{ sub.documentoSustentatorio || b.docSust }}</td>
                    <td class="cod-subcuenta">{{ sub.cuentaCodigo }}</td>
                    <td class="denom-subcuenta">
                      <span style="padding-left: 16px">{{ sub.cuentaNombre }}</span>
                      @if (sub.terceroNombre) {
                        <span class="muted" style="font-size:0.75rem; display:block; padding-left:16px">Tercero: {{ sub.terceroNombre }}</span>
                      }
                    </td>
                    <td class="num val-debe">{{ sub.debe > 0 ? (soles(sub.debe)) : '0.00' }}</td>
                    <td class="num val-haber">{{ sub.haber > 0 ? (soles(sub.haber)) : '0.00' }}</td>
                  </tr>
                }
              }

              <!-- 3. Fila de Cierre del Asiento / Bloque con GLOSA y Totales -->
              <tr class="fila-glosa-bloque">
                <td colspan="5" class="celda-glosa">
                  <div style="display:flex; justify-content:space-between; align-items:center">
                    <div>
                      <strong style="color:#1e293b">GLOSA:</strong>
                      <span style="margin-left:8px; font-style:italic; color:#334155">{{ b.asiento.glosa }}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px">
                      @if (b.cuadra) {
                        <span class="cuadra" style="font-size:0.75rem; padding:2px 8px">
                          <mat-icon style="font-size:14px; width:14px; height:14px">check_circle</mat-icon> Asiento Cuadrado
                        </span>
                      } @else {
                        <span class="nocuadra" style="font-size:0.75rem; padding:2px 8px">
                          <mat-icon style="font-size:14px; width:14px; height:14px">error</mat-icon> Descuadre
                        </span>
                      }
                      @if (auth.registra()) {
                        <button mat-icon-button type="button" (click)="editarAsiento(b.asiento.id)" class="no-print" title="Modificar asiento contable y glosa" style="width:30px; height:30px; color:#0284c7">
                          <mat-icon style="font-size:18px; width:18px; height:18px">edit</mat-icon>
                        </button>
                      }
                    </div>
                  </div>
                </td>
                <td class="num tot-asiento">{{ soles(b.totalDebe) }}</td>
                <td class="num tot-asiento">{{ soles(b.totalHaber) }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" style="text-align:center; padding:32px" class="muted">
                  No se encontraron asientos registrados en el rango de fechas seleccionado.
                </td>
              </tr>
            }
          </tbody>

          <!-- Totales Generales del Libro Diario -->
          <tfoot>
            <tr class="fila-totales-generales">
              <td colspan="5" style="text-align:right; font-weight:800; font-size:0.95rem">
                TOTALES DEL LIBRO DIARIO (S/):
              </td>
              <td class="num total-debe-gen">{{ soles(granTotalDebe()) }}</td>
              <td class="num total-haber-gen">{{ soles(granTotalHaber()) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .libro-diario-container {
      max-width: 1250px;
      margin: 0 auto;
      padding: 20px;
    }
    .header-acciones {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .botones-toolbar {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .filtros-box {
      margin-bottom: 20px;
      background: #ffffff;
      padding: 12px 16px 0;
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    /* Cabecera Oficial SUNAT 5.1 */
    .formato-sunat-header {
      background: #ffffff;
      border: 2px solid #0f172a;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 16px;
    }
    .titulo-formato {
      font-size: 1.15rem;
      font-weight: 800;
      text-align: center;
      color: #0f172a;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .datos-empresa-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 24px;
      font-size: 0.85rem;
    }
    .datos-empresa-grid strong {
      color: #334155;
      margin-right: 6px;
    }

    /* Tabla Libro Diario */
    .tabla-diario {
      border: 1px solid #cbd5e1;
    }
    .tabla-diario th {
      background: #0f172a !important;
      color: #f8fafc !important;
      font-size: 0.72rem !important;
      font-weight: 700 !important;
      padding: 10px 8px !important;
      text-align: center;
      border-right: 1px solid rgba(255, 255, 255, 0.15);
    }

    .asiento-header-bar {
      background: #e2e8f0;
      color: #0f172a;
      font-size: 0.825rem;
      padding: 6px 12px !important;
      border-top: 2px solid #94a3b8;
    }
    .badge-anulado {
      background: #fee2e2;
      color: #b91c1c;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.75rem;
      margin-left: 8px;
    }

    /* 1. Cuenta Principal (2 dígitos en negrita) */
    .fila-cuenta-principal td {
      background: #f1f5f9;
      font-size: 0.875rem;
      border-bottom: 1px solid #cbd5e1;
      padding: 8px 10px;
    }
    .cod-principal {
      color: #1e293b;
      font-weight: 800;
    }
    .denom-principal {
      color: #0f172a;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    /* 2. Subcuentas imputables */
    .fila-subcuenta td {
      background: #ffffff;
      padding: 6px 10px;
      font-size: 0.85rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .cod-subcuenta {
      font-family: monospace;
      font-weight: 600;
      color: #2563eb;
    }
    .val-debe, .val-haber {
      font-family: monospace;
      font-weight: 600;
    }

    /* 3. Fila de Cierre del Asiento / Glosa */
    .fila-glosa-bloque td {
      background: #f8fafc;
      border-bottom: 2px solid #64748b;
      padding: 8px 12px;
    }
    .celda-glosa {
      font-size: 0.85rem;
    }
    .tot-asiento {
      font-weight: 800;
      font-family: monospace;
      font-size: 0.9rem;
      color: #0f172a;
      background: #e2e8f0;
    }

    /* Totales Generales */
    .fila-totales-generales td {
      background: #0f172a;
      color: #ffffff;
      padding: 12px 14px;
      font-size: 0.95rem;
    }
    .total-debe-gen, .total-haber-gen {
      color: #38bdf8;
      font-weight: 800;
      font-family: monospace;
      font-size: 1.05rem;
    }

    /* Estilos de Impresión */
    @media print {
      .no-print { display: none !important; }
      body, html, .pagina { background: #ffffff !important; padding: 0 !important; width: 100% !important; }
      .formato-sunat-header { border: 2px solid #000 !important; margin-bottom: 8px !important; }
      .tabla-diario { border: 1px solid #000 !important; }
      .tabla-diario th { background: #000 !important; color: #fff !important; }
      .scroll { overflow: visible !important; }
    }
  `],
})
export class Asientos implements OnInit {
  private api = inject(Api);
  private dialog = inject(MatDialog);
  store = inject(EmpresaStore);
  auth = inject(Auth);
  soles = soles;

  desde = '';
  hasta = '';
  operacion = '';
  operaciones = ['APERTURA', 'COMPRA_MERCADERIA', 'VENTA_MERCADERIA', 'PAGO_SERVICIO', 'HONORARIOS', 'COBRANZA', 'PAGO_PROVEEDOR', 'PLANILLA', 'DIARIO', 'MANUAL', 'CIERRE'];
  asientos = signal<AsientoVista[]>([]);

  // Agrupamiento jerárquico computado en tiempo real
  bloques = computed<BloqueAsiento[]>(() => {
    return this.asientos().map((a) => {
      const correlativoStr = String(a.numero).padStart(4, '0');
      const codigoLibro = a.codigoLibro || '05';
      const docSust = a.documentoSustentatorio || '—';

      // Agrupar líneas consecutivas por cuenta principal (2 dígitos)
      const grupos: GrupoCuentaPadre[] = [];
      let grupoActual: GrupoCuentaPadre | null = null;

      for (const lin of a.lineas) {
        const padreCod = lin.cuentaPadreCodigo || (lin.cuentaCodigo && lin.cuentaCodigo.length >= 2 ? lin.cuentaCodigo.substring(0, 2) : lin.cuentaCodigo);
        const padreNom = lin.cuentaPadreNombre || 'Cuenta ' + padreCod;

        if (!grupoActual || grupoActual.padreCodigo !== padreCod) {
          grupoActual = {
            padreCodigo: padreCod,
            padreNombre: padreNom,
            subcuentas: [],
          };
          grupos.push(grupoActual);
        }
        grupoActual.subcuentas.push(lin);
      }

      const totalDebe = Math.round(a.lineas.reduce((s, l) => s + (l.debe || 0), 0) * 100) / 100;
      const totalHaber = Math.round(a.lineas.reduce((s, l) => s + (l.haber || 0), 0) * 100) / 100;
      const cuadra = totalDebe === totalHaber && totalDebe > 0;

      return {
        asiento: a,
        correlativoStr,
        codigoLibro,
        docSust,
        grupos,
        totalDebe,
        totalHaber,
        cuadra,
      };
    });
  });

  granTotalDebe = computed(() => Math.round(this.bloques().reduce((s, b) => s + b.totalDebe, 0) * 100) / 100);
  granTotalHaber = computed(() => Math.round(this.bloques().reduce((s, b) => s + b.totalHaber, 0) * 100) / 100);

  periodoDisplay = computed(() => {
    if (this.desde && this.hasta) return `${this.desde} al ${this.hasta}`;
    if (this.desde) return `Desde ${this.desde}`;
    return new Date().toISOString().slice(0, 7); // AAAA-MM
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.get<AsientoVista[]>('/asientos', {
      desde: this.desde,
      hasta: this.hasta,
      operacion: this.operacion,
    }).subscribe((a) => this.asientos.set(a));
  }

  nuevoAsiento() {
    this.dialog.open(AsientoNuevoDialog, {
      width: '850px',
      disableClose: true,
    }).afterClosed().subscribe((guardado) => {
      if (guardado) this.cargar();
    });
  }

  abrirGenerarDesdeComprobantes() {
    this.dialog.open(GenerarAsientoDialog, {
      width: '850px',
    }).afterClosed().subscribe(() => this.cargar());
  }

  editarAsiento(id: number) {
    this.dialog.open(AsientoEditarDialog, {
      data: { id },
      width: '800px',
    }).afterClosed().subscribe((res) => {
      if (res) this.cargar();
    });
  }

  editar(a: AsientoVista) {
    this.dialog.open(AsientoEditarDialog, {
      data: { id: a.id, asiento: a },
      width: '800px',
    }).afterClosed().subscribe((res) => {
      if (res) this.cargar();
    });
  }

  imprimir() {
    window.print();
  }
}
