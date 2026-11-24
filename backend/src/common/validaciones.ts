// Validaciones de documentos de identidad (regla 9 de la sección 10).
export const RUC_PREFIJOS = ['10', '15', '16', '17', '20'];

export function validarDocumento(tipoDoc: string, documento: string): string | null {
  if (tipoDoc === 'RUC') {
    if (!/^\d{11}$/.test(documento)) return 'El RUC debe tener 11 dígitos';
    if (!RUC_PREFIJOS.includes(documento.slice(0, 2))) return 'El RUC debe empezar en 10, 15, 16, 17 o 20';
    return null;
  }
  if (tipoDoc === 'DNI') return /^\d{8}$/.test(documento) ? null : 'El DNI debe tener 8 dígitos';
  return 'Tipo de documento no válido (RUC o DNI)';
}
