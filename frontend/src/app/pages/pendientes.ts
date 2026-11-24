import { Component, inject, OnInit, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { Api } from '../core/api';
import { Auth } from '../core/auth';
import { soles } from '../core/util';

interface Fila { nombre: string; comprobante: string; fecha: string; vencimiento: string; total: number; saldo: number }
interface Rep { filas: Fila[]; totales?: { saldo: number } }

@Component({
  imports: [MatTabsModule, MatButtonModule, RouterLink, NgTemplateOutlet],
  template: `
    <div class="pagina">
      <h1>Por cobrar y por pagar</h1>
      <mat-tab-group>
        <mat-tab label="Por cobrar (S/ {{ soles(cobrar()?.totales?.saldo) }})"><ng-container [ngTemplateOutlet]="tabla" [ngTemplateOutletContext]="{ r: cobrar(), t: 'Cliente' }" /></mat-tab>
        <mat-tab label="Por pagar (S/ {{ soles(pagar()?.totales?.saldo) }})"><ng-container [ngTemplateOutlet]="tabla" [ngTemplateOutletContext]="{ r: pagar(), t: 'Proveedor' }" /></mat-tab>
      </mat-tab-group>
      <ng-template #tabla let-r="r" let-t="t">
        <div class="scroll"><table class="t">
          <thead><tr><th>{{ t }}</th><th>Comprobante</th><th>Emisión</th><th>Vence</th><th class="num">Total</th><th class="num">Saldo</th></tr></thead>
          <tbody>
            @for (f of r?.filas ?? []; track $index) { <tr><td>{{ f.nombre }}</td><td>{{ f.comprobante }}</td><td>{{ f.fecha }}</td><td>{{ f.vencimiento }}</td><td class="num">{{ soles(f.total) }}</td><td class="num">{{ soles(f.saldo) }}</td></tr> }
            @empty { <tr><td colspan="6" class="muted">No hay documentos pendientes.</td></tr> }
          </tbody>
        </table></div>
      </ng-template>
      @if (auth.registra()) { <div class="acciones"><a mat-flat-button routerLink="/registrar">Registrar cobranza o pago</a></div> }
    </div>
  `,
})
export class Pendientes implements OnInit {
  private api = inject(Api);
  auth = inject(Auth);
  soles = soles;
  cobrar = signal<Rep | null>(null);
  pagar = signal<Rep | null>(null);
  ngOnInit() {
    this.api.get<Rep>('/reportes/pendientes/por-cobrar').subscribe((r) => this.cobrar.set(r));
    this.api.get<Rep>('/reportes/pendientes/por-pagar').subscribe((r) => this.pagar.set(r));
  }
}
