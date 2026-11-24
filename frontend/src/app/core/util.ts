export const soles = (n: number | null | undefined) => (n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const hoy = () => new Date().toISOString().slice(0, 10);
export const primerDiaMes = () => hoy().slice(0, 8) + '01';
