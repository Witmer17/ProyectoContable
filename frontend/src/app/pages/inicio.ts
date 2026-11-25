import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../core/api';
import { Auth } from '../core/auth';
import { EmpresaStore } from '../core/empresa';
import { soles } from '../core/util';

interface Rep { totales?: Record<string, number>; resumen?: Record<string, any>; filas: any[] }

@Component({
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="pagina">
      <!-- Header Banner -->
      <div class="dashboard-header">
        <div>
          <h1>Panel de Control Financiero</h1>
          <p class="muted">
            Bienvenido al sistema <strong>ContaSys Pro ERP</strong> ·
            Empresa: <strong>{{ store.empresa()?.razonSocial || 'Corporación Contable S.A.C.' }}</strong> ({{ store.empresa()?.ruc ? 'RUC ' + store.empresa()?.ruc : 'RUC 20600000001' }})
          </p>
        </div>
        <div class="badge-periodo">
          <mat-icon style="font-size:18px; width:18px; height:18px;">event</mat-icon>
          <span>Ejercicio Fiscal 2026</span>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="grid-stats">
        <!-- Por Cobrar -->
        <div class="stat-card stat-cobrar">
          <div class="stat-header">
            <span class="stat-title">Cuentas por Cobrar (Clientes)</span>
            <div class="stat-icon-wrap icon-cobrar">
              <mat-icon>trending_up</mat-icon>
            </div>
          </div>
          <div class="stat-value">S/ {{ soles(cobrar()) }}</div>
          <div class="stat-footer">
            <a routerLink="/pendientes" class="stat-link">Ver clientes pendientes &rarr;</a>
          </div>
        </div>

        <!-- Por Pagar -->
        <div class="stat-card stat-pagar">
          <div class="stat-header">
            <span class="stat-title">Cuentas por Pagar (Proveedores)</span>
            <div class="stat-icon-wrap icon-pagar">
              <mat-icon>trending_down</mat-icon>
            </div>
          </div>
          <div class="stat-value">S/ {{ soles(pagar()) }}</div>
          <div class="stat-footer">
            <a routerLink="/pendientes" class="stat-link">Ver facturas por pagar &rarr;</a>
          </div>
        </div>

        <!-- Balance -->
        <div class="stat-card stat-balance">
          <div class="stat-header">
            <span class="stat-title">Balance de Comprobación</span>
            <div class="stat-icon-wrap icon-balance">
              <mat-icon>balance</mat-icon>
            </div>
          </div>
          <div class="stat-value" style="display: flex; align-items: center; gap: 8px;">
            @if (cuadra() === null) {
              <span class="muted" style="font-size:1rem">Cargando...</span>
            } @else if (cuadra()) {
              <span class="cuadra" style="font-size:1rem; padding: 6px 14px;">
                <mat-icon style="font-size:18px; width:18px; height:18px;">check_circle</mat-icon> Cuadrado (Partida Doble)
              </span>
            } @else {
              <span class="nocuadra" style="font-size:1rem; padding: 6px 14px;">
                <mat-icon style="font-size:18px; width:18px; height:18px;">error</mat-icon> No cuadra
              </span>
            }
          </div>
          <div class="stat-footer">
            <a routerLink="/reportes" class="stat-link">Ver balance de 8 columnas &rarr;</a>
          </div>
        </div>

        <!-- Utilidad -->
        <div class="stat-card stat-utilidad">
          <div class="stat-header">
            <span class="stat-title">Resultado del Ejercicio</span>
            <div class="stat-icon-wrap icon-utilidad">
              <mat-icon>monetization_on</mat-icon>
            </div>
          </div>
          <div class="stat-value" [style.color]="utilidad() >= 0 ? '#15803d' : '#b91c1c'">
            S/ {{ soles(utilidad()) }}
          </div>
          <div class="stat-footer">
            <a routerLink="/reportes" class="stat-link">Estado de Resultados &rarr;</a>
          </div>
        </div>
      </div>

      <!-- Quick Actions Section -->
      <div class="quick-section">
        <h2>Accesos Rápidos</h2>
        <div class="quick-grid">
          <a routerLink="/ventas" class="quick-btn btn-venta">
            <mat-icon>point_of_sale</mat-icon>
            <div>
              <strong>Registro de Ventas (14.1)</strong>
              <span>Emitir factura/boleta y generar asiento</span>
            </div>
          </a>

          <a routerLink="/compras" class="quick-btn btn-compra">
            <mat-icon>shopping_bag</mat-icon>
            <div>
              <strong>Registro de Compras (8.1)</strong>
              <span>Ingresar compras con crédito fiscal IGV</span>
            </div>
          </a>

          <a routerLink="/registrar" class="quick-btn btn-asistente">
            <mat-icon>add_circle</mat-icon>
            <div>
              <strong>Asistente de Operaciones</strong>
              <span>Cobros, pagos, planillas y servicios</span>
            </div>
          </a>

          <a routerLink="/asientos" class="quick-btn btn-diario">
            <mat-icon>menu_book</mat-icon>
            <div>
              <strong>Libro Diario (Asientos)</strong>
              <span>Consultar, auditar y modificar asientos</span>
            </div>
          </a>

          <a routerLink="/cuentas" class="quick-btn btn-cuentas">
            <mat-icon>account_tree</mat-icon>
            <div>
              <strong>Plan Contable (1 al 0)</strong>
              <span>Catálogo PCGE y creación de subcuentas</span>
            </div>
          </a>

          <a routerLink="/terceros" class="quick-btn btn-terceros">
            <mat-icon>groups</mat-icon>
            <div>
              <strong>Clientes y Proveedores</strong>
              <span>Consultar en vivo RUC SUNAT y DNI RENIEC</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .badge-periodo {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .grid-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 20px;
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.2s ease;
    }
    .stat-card:hover {
      box-shadow: var(--card-shadow-hover);
      transform: translateY(-2px);
    }
    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .stat-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .stat-icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-cobrar { background: #dbeafe; color: #1d4ed8; }
    .icon-pagar { background: #fee2e2; color: #dc2626; }
    .icon-balance { background: #fef3c7; color: #d97706; }
    .icon-utilidad { background: #dcfce7; color: #15803d; }

    .stat-value {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 14px;
      font-variant-numeric: tabular-nums;
    }
    .stat-footer {
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
    }
    .stat-link {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--primary);
      text-decoration: none;
    }
    .stat-link:hover { text-decoration: underline; }

    .quick-section {
      margin-top: 24px;
    }
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    .quick-btn {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 18px;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      text-decoration: none;
      color: var(--text-main);
      box-shadow: var(--card-shadow);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .quick-btn:hover {
      border-color: var(--primary);
      box-shadow: var(--card-shadow-hover);
      transform: translateY(-2px);
      text-decoration: none;
    }
    .quick-btn mat-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
      color: var(--primary);
    }
    .quick-btn strong {
      display: block;
      font-size: 0.95rem;
      color: #0f172a;
    }
    .quick-btn span {
      display: block;
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-top: 2px;
    }
  `],
})
export class Inicio implements OnInit {
  private api = inject(Api);
  store = inject(EmpresaStore);
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
