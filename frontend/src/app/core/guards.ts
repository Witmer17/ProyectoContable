import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, Rol } from './auth';
import { EmpresaStore } from './empresa';

/** Exige sesión y, salvo en la pantalla de configuración, que el perfil de la empresa esté definido. */
export const sesionGuard: CanActivateFn = async (ruta) => {
  const auth = inject(Auth), router = inject(Router), store = inject(EmpresaStore);
  if (!auth.usuario()) return router.parseUrl('/login');
  if (!store.cargada()) await store.cargar();
  if (!store.empresa()?.configurada && ruta.routeConfig?.path !== 'configuracion') {
    return auth.esAdmin() ? router.parseUrl('/configuracion') : router.parseUrl('/sin-configurar');
  }
  return true;
};

export const rolGuard = (...roles: Rol[]): CanActivateFn => () => {
  const auth = inject(Auth);
  return auth.esAdmin() || roles.includes(auth.rol()!) ? true : inject(Router).parseUrl('/');
};
