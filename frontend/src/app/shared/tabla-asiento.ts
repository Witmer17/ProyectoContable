import { Component, input } from '@angular/core';
import { soles } from '../core/util';

export interface LineaVista { n?: number; etapa?: string; cuenta: string; nombre?: string; debe: number; haber: number; tercero?: string }

const ETAPAS: Record<string, string> = { PROVISION: 'Provisión', DESTINO: 'Destino', CANCELACION: 'Cancelación', COSTO: 'Costo', BAJA: 'Baja', OTRO: '' };

@Component({
  selector: 'app-indicador-cuadre',
  template: `
    @if (cuadra()) { <span class="cuadra" role="status">Cuadra</span> }
    @else { <span class="nocuadra" role="alert">No cuadra, revisa los montos</span> }
  `,
})
export class IndicadorCuadre {
  cuadra = input.required<boolean>();
}

@Component({
  selector: 'app-tabla-asiento',
  imports: [IndicadorCuadre],
  template: `
    <div class="scroll">
      <table class="t" aria-label="Asientos generados">
        <thead><tr><th>N.º</th><th>Parte</th><th>Cuenta</th><th>Nombre</th><th class="num">Debe</th><th class="num">Haber</th></tr></thead>
        <tbody>
          @for (l of lineas(); track $index) {
            <tr>
              <td>{{ l.n ?? $index + 1 }}</td><td>{{ etapa(l.etapa) }}</td><td>{{ l.cuenta }}</td>
              <td>{{ l.nombre }}@if (l.tercero) { <span class="muted"> · {{ l.tercero }}</span> }</td>
              <td class="num">{{ l.debe ? soles(l.debe) : '' }}</td><td class="num">{{ l.haber ? soles(l.haber) : '' }}</td>
            </tr>
          }
        </tbody>
        <tfoot>
          <tr class="negrita"><td colspan="4">Totales</td><td class="num">{{ soles(debe()) }}</td><td class="num">{{ soles(haber()) }}</td></tr>
        </tfoot>
      </table>
    </div>
    <p><app-indicador-cuadre [cuadra]="cuadra()" /></p>
  `,
})
export class TablaAsiento {
  lineas = input.required<LineaVista[]>();
  debe = input.required<number>();
  haber = input.required<number>();
  cuadra = input.required<boolean>();
  soles = soles;
  etapa = (e?: string) => (e ? ETAPAS[e] ?? e : '');
}
