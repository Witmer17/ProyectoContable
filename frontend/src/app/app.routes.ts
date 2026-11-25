import { Routes } from '@angular/router';
import { sesionGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    canActivate: [sesionGuard],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/inicio').then((m) => m.Inicio) },
      { path: 'configuracion', loadComponent: () => import('./pages/configuracion').then((m) => m.Configuracion) },
      { path: 'compras', loadComponent: () => import('./pages/registro-compras').then((m) => m.RegistroComprasComponent) },
      { path: 'ventas', loadComponent: () => import('./pages/registro-ventas').then((m) => m.RegistroVentasComponent) },
      { path: 'registrar', loadComponent: () => import('./pages/asistente').then((m) => m.Asistente) },
      { path: 'asientos', loadComponent: () => import('./pages/asientos').then((m) => m.Asientos) },
      { path: 'pendientes', loadComponent: () => import('./pages/pendientes').then((m) => m.Pendientes) },
      { path: 'terceros', loadComponent: () => import('./pages/catalogos').then((m) => m.Terceros) },
      { path: 'productos', loadComponent: () => import('./pages/catalogos').then((m) => m.Productos) },
      { path: 'activos', loadComponent: () => import('./pages/catalogos').then((m) => m.Activos) },
      { path: 'cuentas', loadComponent: () => import('./pages/catalogos').then((m) => m.PlanCuentas) },
      { path: 'apertura', loadComponent: () => import('./pages/apertura').then((m) => m.Apertura) },
      { path: 'cierre', loadComponent: () => import('./pages/cierre').then((m) => m.Cierre) },
      { path: 'reportes', loadComponent: () => import('./pages/reportes').then((m) => m.Reportes) },
      { path: 'auditoria', loadComponent: () => import('./pages/admin').then((m) => m.Auditoria) },
      { path: 'usuarios', loadComponent: () => import('./pages/admin').then((m) => m.Usuarios) },
    ],
  },
  { path: 'login', redirectTo: '' },
  { path: 'sin-configurar', redirectTo: '' },
  { path: '**', redirectTo: '' },
];
