import { HttpException, HttpStatus } from '@nestjs/common';

/** Error de negocio asociado a un campo, para mostrarlo junto al campo que lo causa. */
export class ErrorCampo extends HttpException {
  constructor(campo: string, mensaje: string, status = HttpStatus.UNPROCESSABLE_ENTITY) {
    super({ statusCode: status, campo, message: mensaje }, status);
  }
}

export const PERIODO = (f: Date | string): string => {
  const s = typeof f === 'string' ? f : f.toISOString();
  return s.slice(0, 7);
};

export const fechaDate = (s: string): Date => new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
