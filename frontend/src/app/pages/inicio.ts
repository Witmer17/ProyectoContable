import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Api } from '../core/api';
import { Auth } from '../core/auth';
import { soles } from '../core/util';

interface Rep { totales?: Record<string, number>; resumen?: Record<string, any>; filas: any[] }

@Component({
  imports: [RouterLink, MatCardModule, MatButtonModule],
  template: `
    <div class="pagina">
      <h1>Resumen</h1>
      <div class="tarjetas">
        <mat-card style="padding:16px"><div class="muted">Por cobrar</div><h2>S/ {{ soles(cobrar()) }}</h2><a routerLink="/pendientes">Ver detalle</a></mat-card>
        <mat-card style="padding:16px"><div class="muted">Por pagar</div><h2>S/ {{ soles(pagar()) }}</h2><a routerLink="/pendientes">Ver detalle</a></mat-card>
        <mat-card style="padding:16px"><div class="muted">Balance de comprobación</div>
          <h2>@if (cuadra() === null) { … } @else if (cuadra()) { <span class="cuadra">Cuadra</span> } @else { <span class="nocuadra">No cuadra</span> }</h2><a routerLink="/reportes">Ver reportes</a></mat-card>
        <mat-card style="padding:16px"><div class="muted">Utilidad del periodo</div><h2>S/ {{ soles(utilidad()) }}</h2></mat-card>
      </div>
      @if (auth.registra()) {
        <div class="acciones"><a mat-flat-button routerLink="/registrar">Registrar una operación</a></div>
      }
    </div>
  `,
})
export class Inicio implements OnInit {
  private api = inject(Api);
  auth = inject(Auth);
  soles = soles;
  cobrar = signal(0);
  pagar = signal(0);
  cuadra = signal<boolean | null>(null);
  utilidad = signal(0);

  ngOnInit() {
    this.api.get<Rep>('/reportes/pendientes/por-cobrar').subscribe((r) => this.cobrar.set(r.totales?.['saldo'] ?? 0));
    this.api.get<Rep>('/reportes/pendientes/por-pagar').subscribe((r) => this.pagar.set(r.totales?.['saldo'] ?? 0));
    this.api.get<Rep>('/reportes/balance-comprobacion').subscribe((r) => this.cuadra.set(!!r.resumen?.['cuadra']));
    this.api.get<Rep>('/reportes/estado-resultados').subscribe((r) => this.utilidad.set(r.resumen?.['utilidad'] ?? 0));
  }
}
