import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SelectorCuenta } from './selector-cuenta';

const CUENTAS = [
  { codigo: '6363', nombre: 'Agua', naturaleza: 'DEUDORA' },
  { codigo: '6361', nombre: 'Energía eléctrica', naturaleza: 'DEUDORA' },
];

function montar() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const f = TestBed.createComponent(SelectorCuenta);
  f.componentRef.setInput('grupo', '63');
  f.detectChanges();
  TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/cuentas').flush(CUENTAS);
  f.detectChanges();
  return f;
}

describe('SelectorCuenta (código ↔ nombre)', () => {
  it('al escribir el código completa el nombre', () => {
    const f = montar();
    f.componentInstance.alEscribirCodigo('6363');
    f.detectChanges();
    expect(f.componentInstance.nombre()).toBe('Agua');
    expect(f.componentInstance.noExiste()).toBe(false);
  });

  it('al elegir un nombre completa el código', () => {
    const f = montar();
    f.componentInstance.elegir('6361');
    expect(f.componentInstance.codigo()).toBe('6361');
    expect(f.componentInstance.nombre()).toBe('Energía eléctrica');
  });

  it('avisa "Esta cuenta no existe" si el código no está en el plan', () => {
    const f = montar();
    f.componentInstance.alEscribirCodigo('6399');
    f.detectChanges();
    expect(f.componentInstance.noExiste()).toBe(true);
    expect((f.nativeElement as HTMLElement).textContent).toContain('Esta cuenta no existe');
  });
});
