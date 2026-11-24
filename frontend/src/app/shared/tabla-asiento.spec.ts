import { TestBed } from '@angular/core/testing';
import { TablaAsiento } from './tabla-asiento';

describe('TablaAsiento', () => {
  const lineas = [
    { cuenta: '6011', nombre: 'Compras', etapa: 'PROVISION', debe: 1000, haber: 0 },
    { cuenta: '4212', nombre: 'Facturas por pagar', etapa: 'PROVISION', debe: 0, haber: 1000 },
  ];

  function montar(cuadra: boolean) {
    const f = TestBed.createComponent(TablaAsiento);
    f.componentRef.setInput('lineas', lineas);
    f.componentRef.setInput('debe', 1000);
    f.componentRef.setInput('haber', cuadra ? 1000 : 900);
    f.componentRef.setInput('cuadra', cuadra);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('muestra N.º, parte, cuenta, nombre y totales con el indicador verde', () => {
    const el = montar(true);
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
    expect(el.textContent).toContain('Provisión');
    expect(el.querySelector('.cuadra')?.textContent).toContain('Cuadra');
  });

  it('muestra el indicador rojo cuando no cuadra', () => {
    expect(montar(false).querySelector('.nocuadra')?.textContent).toContain('No cuadra, revisa los montos');
  });
});
