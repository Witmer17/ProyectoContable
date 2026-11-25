import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Auth } from './core/auth';
import { EmpresaStore } from './core/empresa';

interface Item { ruta: string; texto: string; icono: string; visible: boolean }

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule],
  template: `
    @if (auth.usuario()) {
      <mat-sidenav-container style="height:100vh">
        <mat-sidenav #nav [mode]="movil() ? 'over' : 'side'" [opened]="!movil()">
          <!-- Brand Logo Header -->
          <div class="brand-box">
            <div class="brand-icon">
              <mat-icon>account_balance</mat-icon>
            </div>
            <div>
              <div class="brand-title">ContaSys Pro ERP</div>
              <div class="brand-subtitle">Gestión Contable PCGE · SUNAT</div>
            </div>
          </div>

          <!-- Empresa Card -->
          <div class="empresa-box">
            <div class="empresa-nombre">{{ store.empresa()?.razonSocial || 'Corporación Contable S.A.C.' }}</div>
            <div class="empresa-ruc">{{ store.empresa()?.ruc ? 'RUC ' + store.empresa()?.ruc : 'RUC 20600000001' }}</div>
          </div>

          <!-- Navigation List -->
          <mat-nav-list class="nav-menu">
            @for (i of items(); track i.ruta) {
              <a mat-list-item [routerLink]="i.ruta" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: i.ruta === '/' }" (click)="movil() && nav.close()" class="nav-item">
                <mat-icon matListItemIcon class="nav-icon">{{ i.icono }}</mat-icon>
                <span matListItemTitle class="nav-text">{{ i.texto }}</span>
              </a>
            }
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content>
          <mat-toolbar class="top-toolbar">
            @if (movil()) {
              <button mat-icon-button (click)="nav.toggle()" aria-label="Abrir menú" class="btn-menu">
                <mat-icon>menu</mat-icon>
              </button>
            }
            <div class="toolbar-title">
              <span class="system-name">ContaSys Pro</span>
              <span class="system-tag">PCGE 2019 & SUNAT</span>
            </div>
            <span style="flex:1"></span>

            <!-- User Info Badge -->
            <div class="user-badge">
              <mat-icon class="user-icon">account_circle</mat-icon>
              <div class="user-details">
                <span class="user-name">{{ auth.usuario()?.nombre }}</span>
                <span class="user-role">{{ auth.rol() }}</span>
              </div>
            </div>

            <button mat-icon-button (click)="auth.logout()" aria-label="Cerrar sesión" title="Cerrar sesión" class="btn-logout">
              <mat-icon>logout</mat-icon>
            </button>
          </mat-toolbar>

          <main class="main-content">
            <router-outlet />
          </main>
        </mat-sidenav-content>
      </mat-sidenav-container>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    mat-sidenav {
      width: 280px;
      background: #0f172a;
      color: #f8fafc;
      border-right: 1px solid #1e293b;
      display: flex;
      flex-direction: column;
      --mat-list-list-item-label-text-color: #f8fafc !important;
      --mdc-list-list-item-label-text-color: #f8fafc !important;
    }

    mat-sidenav::-webkit-scrollbar {
      width: 5px;
    }
    mat-sidenav::-webkit-scrollbar-track {
      background: #0f172a;
    }
    mat-sidenav::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 3px;
    }
    mat-sidenav::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }

    .brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.35);
    }
    .brand-icon mat-icon {
      color: #fff;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    .brand-title {
      font-weight: 700;
      font-size: 1.05rem;
      color: #ffffff;
      letter-spacing: -0.01em;
    }
    .brand-subtitle {
      font-size: 0.72rem;
      color: #94a3b8;
      font-weight: 500;
    }

    .empresa-box {
      margin: 12px 14px;
      padding: 10px 12px;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
    }
    .empresa-nombre {
      font-size: 0.85rem;
      font-weight: 600;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .empresa-ruc {
      font-size: 0.75rem;
      color: #38bdf8;
      font-family: monospace;
      font-weight: 600;
      margin-top: 2px;
    }

    .nav-menu {
      padding: 8px 10px !important;
    }
    .nav-item {
      border-radius: 8px !important;
      margin-bottom: 3px !important;
      height: 42px !important;
      color: #ffffff !important;
      transition: all 0.15s ease-in-out;
    }
    .nav-item:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #ffffff !important;
    }
    .nav-icon {
      color: #94a3b8 !important;
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      margin-right: 12px !important;
      transition: color 0.15s;
    }
    .nav-item:hover .nav-icon {
      color: #38bdf8 !important;
    }
    .nav-text {
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      color: #ffffff !important;
    }

    ::ng-deep mat-sidenav .mat-mdc-list-item .mdc-list-item__primary-text,
    ::ng-deep mat-sidenav .mat-mdc-list-item-title,
    ::ng-deep mat-sidenav .nav-text {
      color: #ffffff !important;
      font-weight: 500 !important;
    }

    ::ng-deep mat-sidenav .mat-mdc-list-item:hover .mdc-list-item__primary-text,
    ::ng-deep mat-sidenav .mat-mdc-list-item:hover .nav-text {
      color: #ffffff !important;
    }

    ::ng-deep mat-sidenav .mat-mdc-list-item:hover .nav-icon {
      color: #38bdf8 !important;
    }

    .nav-item.activo {
      background: linear-gradient(90deg, #2563eb, #1d4ed8) !important;
      color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
    }
    .nav-item.activo .nav-icon {
      color: #ffffff !important;
    }
    .nav-item.activo .nav-text {
      color: #ffffff !important;
      font-weight: 600 !important;
    }

    ::ng-deep mat-sidenav .nav-item.activo .mdc-list-item__primary-text,
    ::ng-deep mat-sidenav .nav-item.activo .mat-mdc-list-item-title,
    ::ng-deep mat-sidenav .nav-item.activo .nav-text {
      color: #ffffff !important;
      font-weight: 600 !important;
    }

    ::ng-deep mat-sidenav .nav-item.activo .nav-icon {
      color: #ffffff !important;
    }

    /* Top Toolbar */
    .top-toolbar {
      background: #ffffff !important;
      color: #0f172a !important;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      padding: 0 20px !important;
      height: 56px !important;
    }
    .toolbar-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .system-name {
      font-weight: 700;
      font-size: 1.05rem;
      color: #0f172a;
    }
    .system-tag {
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 600;
    }

    .user-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      margin-right: 8px;
    }
    .user-icon {
      color: #64748b;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
    .user-details {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }
    .user-name {
      font-size: 0.825rem;
      font-weight: 600;
      color: #1e293b;
    }
    .user-role {
      font-size: 0.68rem;
      color: #2563eb;
      font-weight: 700;
      text-transform: uppercase;
    }
    .btn-logout {
      color: #64748b;
    }
    .btn-logout:hover {
      color: #dc2626;
      background: #fee2e2;
    }

    .main-content {
      background: #f8fafc;
      min-height: calc(100vh - 56px);
    }
  `],
})
export class App {
  auth = inject(Auth);
  store = inject(EmpresaStore);
  movil = toSignal(inject(BreakpointObserver).observe('(max-width: 900px)').pipe(map((r) => r.matches)), { initialValue: false });

  items = computed<Item[]>(() => {
    const m = this.store.modulos();
    const a = this.auth;
    return ([
      { ruta: '/', texto: 'Inicio', icono: 'home', visible: true },
      { ruta: '/compras', texto: 'Registro Compras (8.1)', icono: 'shopping_bag', visible: a.registra() },
      { ruta: '/ventas', texto: 'Registro Ventas (14.1)', icono: 'point_of_sale', visible: a.registra() },
      { ruta: '/registrar', texto: 'Asistente de operaciones', icono: 'add_circle', visible: a.registra() },
      { ruta: '/asientos', texto: 'Libro Diario (Asientos)', icono: 'menu_book', visible: true },
      { ruta: '/cuentas', texto: 'Plan de cuentas (1 al 0)', icono: 'account_tree', visible: true },
      { ruta: '/pendientes', texto: 'Por cobrar y por pagar', icono: 'account_balance_wallet', visible: true },
      { ruta: '/terceros', texto: 'Clientes y proveedores', icono: 'groups', visible: true },
      { ruta: '/productos', texto: 'Productos y kárdex', icono: 'inventory_2', visible: !!m?.kardex },
      { ruta: '/activos', texto: 'Activos fijos', icono: 'directions_car', visible: !!m?.activos },
      { ruta: '/apertura', texto: 'Asiento de apertura', icono: 'flag', visible: a.contable() },
      { ruta: '/cierre', texto: 'Cierre de periodos', icono: 'lock', visible: a.contable() },
      { ruta: '/reportes', texto: 'Reportes y Estados', icono: 'assessment', visible: true },
      { ruta: '/auditoria', texto: 'Auditoría', icono: 'history', visible: a.contable() },
      { ruta: '/usuarios', texto: 'Usuarios', icono: 'manage_accounts', visible: a.esAdmin() },
      { ruta: '/configuracion', texto: 'Configuración', icono: 'settings', visible: a.esAdmin() },
    ] as Item[]).filter((i) => i.visible);
  });
}
