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
          <div style="padding:16px 16px 8px"><strong>{{ store.empresa()?.razonSocial ?? 'Sistema Contable' }}</strong><div class="muted">RUC {{ store.empresa()?.ruc }}</div></div>
          <mat-nav-list>
            @for (i of items(); track i.ruta) {
              <a mat-list-item [routerLink]="i.ruta" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: i.ruta === '/' }" (click)="movil() && nav.close()">
                <mat-icon matListItemIcon>{{ i.icono }}</mat-icon><span matListItemTitle>{{ i.texto }}</span>
              </a>
            }
          </mat-nav-list>
        </mat-sidenav>
        <mat-sidenav-content>
          <mat-toolbar color="primary">
            @if (movil()) { <button mat-icon-button (click)="nav.toggle()" aria-label="Abrir menú"><mat-icon>menu</mat-icon></button> }
            <span style="flex:1">Sistema Contable · PCGE 2019</span>
            <span class="muted" style="color:#fff;margin-right:8px">{{ auth.usuario()?.nombre }} ({{ auth.rol() }})</span>
            <button mat-icon-button (click)="auth.logout()" aria-label="Cerrar sesión"><mat-icon>logout</mat-icon></button>
          </mat-toolbar>
          <router-outlet />
        </mat-sidenav-content>
      </mat-sidenav-container>
    } @else {
      <router-outlet />
    }
  `,
  styles: ['mat-sidenav { width: 260px; } .activo { background: #e0e7ff; }'],
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
      { ruta: '/registrar', texto: 'Registrar operación', icono: 'add_circle', visible: a.registra() },
      { ruta: '/asientos', texto: 'Diario de asientos', icono: 'menu_book', visible: true },
      { ruta: '/pendientes', texto: 'Por cobrar y por pagar', icono: 'account_balance_wallet', visible: true },
      { ruta: '/terceros', texto: 'Clientes y proveedores', icono: 'groups', visible: true },
      { ruta: '/productos', texto: 'Productos y kárdex', icono: 'inventory_2', visible: !!m?.kardex },
      { ruta: '/activos', texto: 'Activos fijos', icono: 'directions_car', visible: !!m?.activos },
      { ruta: '/cuentas', texto: 'Plan de cuentas', icono: 'account_tree', visible: true },
      { ruta: '/apertura', texto: 'Asiento de apertura', icono: 'flag', visible: a.contable() },
      { ruta: '/cierre', texto: 'Cierre de periodos', icono: 'lock', visible: a.contable() },
      { ruta: '/reportes', texto: 'Reportes', icono: 'assessment', visible: true },
      { ruta: '/auditoria', texto: 'Auditoría', icono: 'history', visible: a.contable() },
      { ruta: '/usuarios', texto: 'Usuarios', icono: 'manage_accounts', visible: a.esAdmin() },
      { ruta: '/configuracion', texto: 'Configuración', icono: 'settings', visible: a.esAdmin() },
    ] as Item[]).filter((i) => i.visible);
  });
}
