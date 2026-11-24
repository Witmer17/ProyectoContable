import { Actividad } from '@prisma/client';

export interface PerfilEmpresa {
  actividad: Actividad;
  tienePlanilla: boolean;
  tieneActivos: boolean;
  usaDolares: boolean;
  recibeHonorarios: boolean;
}

/** Perfiles prearmados (sección 2.1). `PERSONALIZADO` responde las seis preguntas. */
export const PERFILES: Record<string, { nombre: string; descripcion: string; respuestas: PerfilEmpresa }> = {
  TIENDA: {
    nombre: 'Tienda o comercio',
    descripcion: 'Compra y vende mercadería, con kárdex.',
    respuestas: { actividad: 'COMERCIAL', tienePlanilla: false, tieneActivos: false, usaDolares: false, recibeHonorarios: false },
  },
  SERVICIOS: {
    nombre: 'Consultoría o servicios',
    descripcion: 'Presta servicios, sin kárdex; recibe recibos por honorarios.',
    respuestas: { actividad: 'SERVICIOS', tienePlanilla: false, tieneActivos: false, usaDolares: false, recibeHonorarios: true },
  },
  FABRICA: {
    nombre: 'Fábrica',
    descripcion: 'Compra insumos y vende lo que produce, con kárdex de insumos y productos.',
    respuestas: { actividad: 'INDUSTRIAL', tienePlanilla: true, tieneActivos: true, usaDolares: false, recibeHonorarios: false },
  },
};

/** Módulos visibles según el perfil. */
export function modulosDe(e: PerfilEmpresa & { configurada?: boolean }) {
  const mercaderia = e.actividad !== 'SERVICIOS';
  return {
    kardex: mercaderia,
    planilla: e.tienePlanilla,
    activos: e.tieneActivos,
    dolares: e.usaDolares,
    honorarios: e.recibeHonorarios,
    comercial: e.actividad === 'COMERCIAL' || e.actividad === 'MIXTA',
    servicios: e.actividad === 'SERVICIOS' || e.actividad === 'MIXTA',
    industrial: e.actividad === 'INDUSTRIAL' || e.actividad === 'MIXTA',
    mixta: e.actividad === 'MIXTA',
  };
}
