import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Api, errorDe } from '../core/api';
import { Auth } from '../core/auth';

export interface Cuenta {
  codigo: string;
  nombre: string;
  naturaleza: string;
  requiereDestino?: boolean;
  destinoDefecto?: string;
  activa?: boolean;
  ultimoNivel?: boolean;
}

/**
 * Código y nombre sincronizados: al escribir el código se completa el nombre y al elegir un nombre
 * se completa el código. Solo muestra cuentas de último nivel del perfil de la empresa.
 */
@Component({
  selector: 'app-selector-cuenta',
  imports: [MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatButtonModule],
  template: `
    <div class="fila" style="gap:8px">
      <mat-form-field class="angosto" style="flex:0 1 130px">
        <mat-label>Código</mat-label>
        <input matInput inputmode="numeric" [value]="codigo()" (input)="alEscribirCodigo($any($event.target).value)" autocomplete="off" aria-label="Código de cuenta" />
      </mat-form-field>
      <mat-form-field style="flex:1 1 260px" [class.rojo]="noExiste()">
        <mat-label>{{ etiqueta() }}</mat-label>
        <input matInput [value]="nombre()" (input)="alEscribirNombre($any($event.target).value)" [matAutocomplete]="auto" autocomplete="off" />
        <mat-autocomplete #auto="matAutocomplete" (optionSelected)="elegir($event.option.value)">
          @for (c of sugeridas(); track c.codigo) { <mat-option [value]="c.codigo">{{ c.codigo }} · {{ c.nombre }}</mat-option> }
        </mat-autocomplete>
      </mat-form-field>
    </div>
    @if (noExiste()) {
      <div class="falta" role="alert">
        Esta cuenta no existe
        @if (auth.esAdmin()) { <button mat-button type="button" (click)="crear()">Crear cuenta {{ codigo() }}</button> }
      </div>
    }
    @if (msg()) { <div class="falta" role="alert">{{ msg() }}</div> }
  `,
  styles: [':host{display:block}'],
})
export class SelectorCuenta {
  codigo = model<string>('');
  grupo = input('');
  etiqueta = input('Nombre de la cuenta');
  cuentas = signal<Cuenta[]>([]);
  consulta = signal('');
  msg = signal('');
  auth = inject(Auth);
  private api = inject(Api);

  nombre = computed(() => this.consulta() || this.cuentas().find((c) => c.codigo === this.codigo())?.nombre || '');
  noExiste = computed(() => this.codigo().length >= 2 && this.cuentas().length > 0 && !this.cuentas().some((c) => c.codigo === this.codigo()));
  sugeridas = computed(() => {
    const q = this.consulta().toLowerCase();
    return this.cuentas().filter((c) => !q || c.nombre.toLowerCase().includes(q) || c.codigo.startsWith(q)).slice(0, 30);
  });

  constructor() {
    effect(() => this.api.get<Cuenta[]>('/cuentas', { grupo: this.grupo() }).subscribe((c) => this.cuentas.set(c)));
  }

  alEscribirCodigo(v: string) { this.consulta.set(''); this.msg.set(''); this.codigo.set(v.trim()); }
  alEscribirNombre(v: string) { this.consulta.set(v); }
  elegir(codigo: string) { this.consulta.set(''); this.msg.set(''); this.codigo.set(codigo); }

  /** Solo administrador: crea la cuenta con el código escrito, pidiendo el nombre. */
  crear() {
    const nombre = this.consulta().trim();
    if (!nombre) { this.msg.set('Escribe el nombre de la nueva cuenta en el campo de nombre y vuelve a pulsar el botón'); return; }
    const c = this.codigo();
    const naturaleza = /^[1-3567]/.test(c) && !/^5/.test(c) ? 'DEUDORA' : /^[4-5]|^7/.test(c) ? 'ACREEDORA' : 'DEUDORA';
    this.api.post<Cuenta>('/cuentas', { codigo: c, nombre, naturaleza }).subscribe({
      next: (n) => { this.cuentas.update((l) => [...l, n]); this.consulta.set(''); this.msg.set(''); },
      error: (e) => this.msg.set(errorDe(e).mensaje),
    });
  }
}
