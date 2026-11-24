import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');

export interface Columna { key: string; titulo: string; tipo?: 'texto' | 'num' }
export interface Reporte {
  titulo: string;
  subtitulo?: string;
  columnas: Columna[];
  filas: Record<string, any>[];
  totales?: Record<string, any>;
  resumen?: Record<string, any>;
}

const fmt = (v: any, tipo?: string) => (tipo === 'num' && typeof v === 'number' ? v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v ?? '');

export async function aExcel(r: Reporte): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(r.titulo.slice(0, 31));
  ws.addRow([r.titulo]).font = { bold: true, size: 14 };
  if (r.subtitulo) ws.addRow([r.subtitulo]);
  ws.addRow([]);
  const cab = ws.addRow(r.columnas.map((c) => c.titulo));
  cab.font = { bold: true };
  r.columnas.forEach((c, i) => {
    ws.getColumn(i + 1).width = Math.max(14, c.titulo.length + 4);
    if (c.tipo === 'num') ws.getColumn(i + 1).numFmt = '#,##0.00';
  });
  for (const f of r.filas) ws.addRow(r.columnas.map((c) => f[c.key]));
  if (r.totales) ws.addRow(r.columnas.map((c) => r.totales![c.key] ?? '')).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function aPdf(r: Reporte): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', layout: r.columnas.length > 6 ? 'landscape' : 'portrait', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.fontSize(14).text(r.titulo);
    if (r.subtitulo) doc.fontSize(9).text(r.subtitulo);
    doc.moveDown();
    const ancho = (doc.page.width - 72) / r.columnas.length;
    const fila = (vals: any[], negrita = false) => {
      if (doc.y > doc.page.height - 60) doc.addPage();
      const y = doc.y;
      doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
      let h = 0;
      vals.forEach((v, i) => {
        const col = r.columnas[i];
        doc.text(String(fmt(v, col.tipo)), 36 + i * ancho, y, { width: ancho - 4, align: col.tipo === 'num' ? 'right' : 'left' });
        h = Math.max(h, doc.y - y);
      });
      doc.y = y + h + 2;
    };
    fila(r.columnas.map((c) => c.titulo), true);
    for (const f of r.filas) fila(r.columnas.map((c) => f[c.key]));
    if (r.totales) fila(r.columnas.map((c) => r.totales![c.key] ?? ''), true);
    doc.end();
  });
}
