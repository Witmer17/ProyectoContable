import { Component, input, model } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { r2 } from '../core/util';

export type ModoIgv = 'INCLUYE' | 'MAS' | 'SIN';

/** Tres campos (Base, IGV, Total) con modo de cálculo; al cambiar uno se recalculan los demás. */
@Component({
  selector: 'app-montos',
  imports: [MatFormFieldModule, MatInputModule, MatButtonToggleModule],
  template: `
    <mat-button-toggle-group [value]="modo()" (change)="cambiarModo($event.value)" aria-label="Modo de cálculo del IGV">
      <mat-button-toggle value="INCLUYE">Incluye IGV</mat-button-toggle>
      <mat-button-toggle value="MAS">Más IGV</mat-button-toggle>
      <mat-button-toggle value="SIN">Sin IGV</mat-button-toggle>
    </mat-button-toggle-group>
    @if (modoPorDefecto()) { <div class="muted">Por defecto: el monto incluye IGV, porque no indicaste otro modo.</div> }
    <div class="fila" style="margin-top:8px">
      <mat-form-field><mat-label>Base{{ moneda() === 'USD' ? ' (US$)' : '' }}</mat-label>
        <input matInput type="number" step="0.01" min="0" [value]="base()" [readonly]="soloLectura()" (input)="alBase(+$any($event.target).value)" />
      </mat-form-field>
      <mat-form-field><mat-label>IGV{{ manual() ? ' (manual)' : '' }}</mat-label>
        <input matInput type="number" step="0.01" min="0" [value]="igv()" [readonly]="soloLectura() || modo() === 'SIN'" (input)="alIgv(+$any($event.target).value)" />
      </mat-form-field>
      <mat-form-field><mat-label>Total</mat-label>
        <input matInput type="number" step="0.01" min="0" [value]="total()" [readonly]="soloLectura()" (input)="alTotal(+$any($event.target).value)" />
      </mat-form-field>
    </div>
    @if (descuadre()) { <div class="falta" role="alert">Base + IGV no es igual al Total</div> }
  `,
})
export class Montos {
  modo = model<ModoIgv>('INCLUYE');
  base = model(0);
  igv = model(0);
  total = model(0);
  manual = model(false);
  soloLectura = input(false);
  moneda = input('PEN');
  tasa = input(0.18);
  tocado = model(false);

  modoPorDefecto = () => !this.tocado();
  descuadre = () => Math.abs(r2(this.base() + this.igv()) - this.total()) > 0.005;

  alTotal(v: number) {
    this.tocado.set(true);
    this.total.set(v);
    if (this.modo() === 'SIN') { this.base.set(v); this.igv.set(0); }
    else { const b = r2(v / (1 + this.tasa())); this.base.set(b); this.igv.set(r2(v - b)); }
    this.manual.set(false);
  }
  alBase(v: number) {
    this.tocado.set(true);
    this.base.set(v);
    if (this.modo() === 'SIN') { this.igv.set(0); this.total.set(v); }
    else { const i = r2(v * this.tasa()); this.igv.set(i); this.total.set(r2(v + i)); }
    this.manual.set(false);
  }
  alIgv(v: number) { this.tocado.set(true); this.manual.set(true); this.igv.set(v); this.total.set(r2(this.base() + v)); }

  cambiarModo(m: ModoIgv) {
    this.tocado.set(true);
    this.modo.set(m);
    if (m === 'MAS') this.alBase(this.base() || this.total());
    else this.alTotal(this.total() || this.base());
  }

  /** Fija el importe principal (el total si "incluye IGV", la base si "más IGV"), p. ej. desde la suma de productos. */
  fijarPrimario(v: number) { this.modo() === 'MAS' ? this.alBase(v) : this.alTotal(v); }

  /** Importe que se envía al servidor según el modo elegido. */
  monto(): number { return this.modo() === 'MAS' ? this.base() : this.total(); }
}
