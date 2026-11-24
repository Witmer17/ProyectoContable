import { TestBed } from '@angular/core/testing';
import { Montos } from './montos';

function crear() {
  const f = TestBed.createComponent(Montos);
  f.detectChanges();
  return f.componentInstance;
}

describe('Montos (Base / IGV / Total)', () => {
  it('"Incluye IGV" es el modo por defecto y calcula Base = Total ÷ 1.18', () => {
    const m = crear();
    expect(m.modo()).toBe('INCLUYE');
    m.alTotal(1180);
    expect([m.base(), m.igv(), m.total()]).toEqual([1000, 180, 1180]);
  });

  it('"Más IGV": IGV = Base × 0.18 y Total = Base + IGV', () => {
    const m = crear();
    m.cambiarModo('MAS');
    m.alBase(1000);
    expect([m.base(), m.igv(), m.total()]).toEqual([1000, 180, 1180]);
  });

  it('"Sin IGV": no hay IGV y Total = Base', () => {
    const m = crear();
    m.cambiarModo('SIN');
    m.alTotal(500);
    expect([m.base(), m.igv(), m.total()]).toEqual([500, 0, 500]);
  });

  it('el IGV editado a mano se marca como manual y mantiene Base + IGV = Total', () => {
    const m = crear();
    m.alTotal(1180);
    m.alIgv(170);
    expect(m.manual()).toBe(true);
    expect(m.total()).toBe(1170);
    expect(m.descuadre()).toBe(false);
  });

  it('redondeo del caso de regresión: 43,750 incluido IGV → Base 37,076.27 e IGV 6,673.73', () => {
    const m = crear();
    m.alTotal(43750);
    expect([m.base(), m.igv()]).toEqual([37076.27, 6673.73]);
  });

  it('al cambiar de modo conserva el importe principal', () => {
    const m = crear();
    m.alTotal(1180);
    m.cambiarModo('MAS');
    expect(m.monto()).toBe(m.base());
  });
});
