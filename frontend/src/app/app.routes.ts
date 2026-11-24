import { Routes } from '@angular/router';
import { rolGuard, sesionGuard } from './core/guards';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login').then((m) => m.Login) },
  { path: 'sin-configurar', loadComponent: () => import('./pages/login').then((m) => m.SinConfigurar) },
  {
    path: '',
    canActivate: [sesionGuard],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/inicio').then((m) => m.Inicio) },
      { path: 'configuracion', loadComponent: () => import('./pages/configuracion').then((m) => m.Configuracion), canActivate: [rolGuard()] },
      { path: 'registrar', loadComponent: () => import('./pages/asistente').then((m) => m.Asistente), canActivate: [rolGuard('CONTADOR', 'AUXILIAR')] },
      { path: 'asientos', loadComponent: () => import('./pages/asientos').then((m) => m.Asientos) },
      { path: 'pendientes', loadComponent: () => import('./pages/pendientes').then((m) => m.Pendientes) },
      { path: 'terceros', loadComponent: () => import('./pages/catalogos').then((m) => m.Terceros) },
      { path: 'productos', loadComponent: () => import('./pages/catalogos').then((m) => m.Productos) },
      { path: 'activos', loadComponent: () => import('./pages/catalogos').then((m) => m.Activos) },
      { path: 'cuentas', loadComponent: () => import('./pages/catalogos').then((m) => m.PlanCuentas) },
      { path: 'apertura', loadComponent: () => import('./pages/apertura').then((m) => m.Apertura), canActivate: [rolGuard('CONTADOR')] },
      { path: 'cierre', loadComponent: () => import('./pages/cierre').then((m) => m.Cierre), canActivate: [rolGuard('CONTADOR')] },
      { path: 'reportes', loadComponent: () => import('./pages/reportes').then((m) => m.Reportes) },
      { path: 'auditoria', loadComponent: () => import('./pages/admin').then((m) => m.Auditoria), canActivate: [rolGuard('CONTADOR')] },
      { path: 'usuarios', loadComponent: () => import('./pages/admin').then((m) => m.Usuarios), canActivate: [rolGuard()] },
    ],
  },
  { path: '**', redirectTo: '' },
];
