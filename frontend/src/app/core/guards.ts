import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { EmpresaStore } from './empresa';

export const sesionGuard: CanActivateFn = async () => {
  const store = inject(EmpresaStore);
  if (!store.cargada()) {
    try {
      await store.cargar();
    } catch {}
  }
  return true;
};

export const rolGuard = (...roles: any[]): CanActivateFn => () => true;
