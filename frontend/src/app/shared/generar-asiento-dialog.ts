import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Api } from '../core/api';
import { soles } from '../core/util';
import { AsientoNuevoDialog, DatosPrellenadoAsiento } from './asiento-nuevo-dialog';

interface DocumentoPendiente {
  id: number;
  sentido: 'COMPRA' | 'VENTA';
  tipo: string;
  serie: string;
  numero: string;
  terceroId?: number;
  terceroNombre?: string;
  terceroDocumento?: string;
  fecha: string;
  base: number;
  igv: number;
  total: number;
  condicion?: string;
}

@Component({
  selector: 'app-generar-asiento-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title style="display:flex; align-items:center; gap:8px">
      <mat-icon color="primary">receipt_long</mat-icon>
      Comprobantes Pendientes de Contabilizar (Compras y Ventas)
    </h2>
    <mat-dialog-content style="min-width: 650px; max-width: 90vw; max-height: 75vh">
      <p style="font-size:0.85rem; color:#64748b; margin-top:0">
        Seleccione un comprobante de compra o venta para generar su asiento contable y glosa en el Libro Diario. Podrá revisar y editar cada cuenta y monto antes de confirmar.
      </p>

      @if (cargando()) {
        <div style="display:flex; justify-content:center; padding:32px">
          <mat-spinner diameter="32"></mat-spinner>
        </div>
      } @else if (documentos().length === 0) {
        <div style="text-align:center; padding:40px 20px; background:#f8fafc; border-radius:8px; border:1px dashed #cbd5e1">
          <mat-icon style="font-size:40px; width:40px; height:40px; color:#94a3b8">check_circle_outline</mat-icon>
          <h4 style="margin:8px 0 4px; color:#334155">No hay comprobantes pendientes</h4>
          <p style="margin:0; font-size:0.85rem; color:#64748b">Todos los comprobantes de compras y ventas ya fueron contabilizados en el Libro Diario.</p>
        </div>
      } @else {
        <div style="overflow-x:auto">
          <table style="width:100%; border-collapse:collapse; font-size:0.85rem">
            <thead>
              <tr style="background:#f1f5f9; text-align:left; border-bottom:2px solid #cbd5e1">
                <th style="padding:10px 8px">Tipo</th>
                <th style="padding:10px 8px">Fecha</th>
                <th style="padding:10px 8px">Comprobante</th>
                <th style="padding:10px 8px">Cliente / Proveedor</th>
                <th style="padding:10px 8px; text-align:right">Base (S/)</th>
                <th style="padding:10px 8px; text-align:right">IGV (S/)</th>
                <th style="padding:10px 8px; text-align:right">Total (S/)</th>
                <th style="padding:10px 8px; text-align:center">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (d of documentos(); track d.id) {
                <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.15s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                  <td style="padding:10px 8px">
                    <span [style.background]="d.sentido === 'VENTA' ? '#dbeafe' : '#fef3c7'"
                          [style.color]="d.sentido === 'VENTA' ? '#1e40af' : '#92400e'"
                          style="padding:3px 8px; border-radius:12px; font-weight:700; font-size:0.75rem">
                      {{ d.sentido }}
                    </span>
                  </td>
                  <td style="padding:10px 8px">{{ d.fecha }}</td>
                  <td style="padding:10px 8px; font-weight:600">
                    {{ d.tipo === '01' ? 'Factura' : (d.tipo === '03' ? 'Boleta' : 'Recibo') }} {{ d.serie }}-{{ d.numero }}
                  </td>
                  <td style="padding:10px 8px">
                    <div style="font-weight:600; color:#0f172a">{{ d.terceroNombre || '—' }}</div>
                    <div style="font-size:0.75rem; color:#64748b">{{ d.terceroDocumento }}</div>
                  </td>
                  <td style="padding:10px 8px; text-align:right">{{ soles(d.base) }}</td>
                  <td style="padding:10px 8px; text-align:right">{{ soles(d.igv) }}</td>
                  <td style="padding:10px 8px; text-align:right; font-weight:700">{{ soles(d.total) }}</td>
                  <td style="padding:10px 8px; text-align:center">
                    <button mat-flat-button color="primary" style="height:32px; font-size:0.75rem" (click)="contabilizar(d)">
                      <mat-icon style="font-size:16px; width:16px; height:16px">edit_note</mat-icon> Contabilizar
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:12px 24px">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
})
export class GenerarAsientoDialog implements OnInit {
  private api = inject(Api);
  private dialog = inject(MatDialog);
  private ref = inject(MatDialogRef<GenerarAsientoDialog>);

  documentos = signal<DocumentoPendiente[]>([]);
  cargando = signal(true);
  soles = soles;

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.api.get<DocumentoPendiente[]>('/documentos/pendientes-asiento').subscribe({
      next: (docs) => {
        this.documentos.set(docs || []);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  contabilizar(d: DocumentoPendiente) {
    const esVenta = d.sentido === 'VENTA';
    const tipoNom = d.tipo === '01' ? 'Factura' : (d.tipo === '03' ? 'Boleta' : 'Comprobante');
    const docSust = `${d.serie}-${d.numero}`;
    const glosa = esVenta
      ? `Por la venta según ${tipoNom} ${docSust}${d.terceroNombre ? ' a ' + d.terceroNombre : ''}`
      : `Por la compra según ${tipoNom} ${docSust}${d.terceroNombre ? ' a ' + d.terceroNombre : ''}`;

    let lineas: Array<{ cuentaCodigo: string; debe: number; haber: number }> = [];

    if (esVenta) {
      // Venta: 1212 (Debe total), 40111 (Haber IGV), 7012 (Haber base)
      lineas = [
        { cuentaCodigo: '1212', debe: d.total, haber: 0 },
        { cuentaCodigo: '40111', debe: 0, haber: d.igv },
        { cuentaCodigo: '7012', debe: 0, haber: d.base },
      ];
    } else {
      // Compra: 6011 (Debe base), 40111 (Debe IGV), 4212 (Haber total)
      lineas = [
        { cuentaCodigo: '6011', debe: d.base, haber: 0 },
        { cuentaCodigo: '40111', debe: d.igv, haber: 0 },
        { cuentaCodigo: '4212', debe: 0, haber: d.total },
      ];
    }

    const prellenado: DatosPrellenadoAsiento = {
      documentoId: d.id,
      codigoLibro: esVenta ? '14' : '08',
      documentoSustentatorio: docSust,
      glosa,
      fecha: d.fecha,
      lineas,
    };

    this.ref.close();

    // Abre AsientoNuevoDialog con todos los datos precargados para que el usuario pueda EDITARLO todo
    this.dialog.open(AsientoNuevoDialog, {
      data: prellenado,
      width: '900px',
      disableClose: true,
    });
  }
}
