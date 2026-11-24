import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api } from './api';

export interface Modulos { kardex: boolean; planilla: boolean; activos: boolean; dolares: boolean; honorarios: boolean; comercial: boolean; servicios: boolean; industrial: boolean; mixta: boolean }
export interface Empresa {
  ruc: string; razonSocial: string; actividad: 'COMERCIAL' | 'SERVICIOS' | 'INDUSTRIAL' | 'MIXTA';
  tienePlanilla: boolean; tieneActivos: boolean; usaDolares: boolean; recibeHonorarios: boolean;
  igvTasa: number; retencionTasa: number; configurada: boolean; perfil: string; modulos: Modulos;
}

@Injectable({ providedIn: 'root' })
export class EmpresaStore {
  private api = inject(Api);
  readonly empresa = signal<Empresa | null>(null);
  readonly cargada = signal(false);
  readonly modulos = computed(() => this.empresa()?.modulos);

  async cargar() {
    this.empresa.set(await firstValueFrom(this.api.get<Empresa | null>('/empresa')));
    this.cargada.set(true);
  }
}
