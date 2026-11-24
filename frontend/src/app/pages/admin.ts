import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Api, errorDe } from '../core/api';

interface Usr { id: number; email: string; nombre: string; rol: string; activo: boolean }

@Component({
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  template: `
    <div class="pagina">
      <h1>Usuarios y roles</h1>
      <p class="muted">Administrador: todo · Contador: todo menos configuración · Auxiliar: solo documentos y pagos · Lectura: solo reportes.</p>
      <div class="scroll"><table class="t">
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Activo</th></tr></thead>
        <tbody>
          @for (u of lista(); track u.id) {
            <tr><td>{{ u.nombre }}</td><td>{{ u.email }}</td>
              <td><mat-select [value]="u.rol" (selectionChange)="cambiar(u, { rol: $event.value })" [attr.aria-label]="'Rol de ' + u.nombre"><mat-option value="ADMINISTRADOR">Administrador</mat-option><mat-option value="CONTADOR">Contador</mat-option><mat-option value="AUXILIAR">Auxiliar</mat-option><mat-option value="LECTURA">Lectura</mat-option></mat-select></td>
              <td><mat-slide-toggle [checked]="u.activo" (change)="cambiar(u, { activo: $event.checked })" [attr.aria-label]="'Activo ' + u.nombre" /></td></tr>
          }
        </tbody>
      </table></div>
      <h2>Nuevo usuario</h2>
      <form [formGroup]="f" (ngSubmit)="crear()" class="fila">
        <mat-form-field><mat-label>Nombre</mat-label><input matInput formControlName="nombre" /></mat-form-field>
        <mat-form-field><mat-label>Correo</mat-label><input matInput type="email" formControlName="email" /></mat-form-field>
        <mat-form-field><mat-label>Contraseña (mín. 8)</mat-label><input matInput type="password" formControlName="password" autocomplete="new-password" /></mat-form-field>
        <mat-form-field><mat-label>Rol</mat-label><mat-select formControlName="rol"><mat-option value="CONTADOR">Contador</mat-option><mat-option value="AUXILIAR">Auxiliar</mat-option><mat-option value="LECTURA">Lectura</mat-option><mat-option value="ADMINISTRADOR">Administrador</mat-option></mat-select></mat-form-field>
        <button mat-flat-button type="submit" [disabled]="f.invalid">Crear</button>
      </form>
      @if (error()) { <p class="falta" role="alert">{{ error() }}</p> }
    </div>
  `,
})
export class Usuarios implements OnInit {
  private api = inject(Api);
  lista = signal<Usr[]>([]);
  error = signal('');
  f = inject(FormBuilder).nonNullable.group({ nombre: ['', Validators.required], email: ['', [Validators.required, Validators.email]], password: ['', [Validators.required, Validators.minLength(8)]], rol: ['CONTADOR'] });
  ngOnInit() { this.cargar(); }
  cargar() { this.api.get<Usr[]>('/usuarios').subscribe((l) => this.lista.set(l)); }
  cambiar(u: Usr, c: Partial<Usr>) { this.api.patch(`/usuarios/${u.id}`, c).subscribe({ next: () => this.cargar(), error: (e) => this.error.set(errorDe(e).mensaje) }); }
  crear() { this.error.set(''); this.api.post('/usuarios', this.f.getRawValue()).subscribe({ next: () => { this.f.reset({ rol: 'CONTADOR' }); this.cargar(); }, error: (e) => this.error.set(errorDe(e).mensaje) }); }
}

interface Aud { id: number; accion: string; entidad: string; entidadId?: string; detalle?: string; fecha: string; usuario?: { nombre: string } }

@Component({
  template: `
    <div class="pagina">
      <h1>Auditoría</h1>
      <p class="muted">Quién creó, modificó o anuló cada asiento y cuándo. Los asientos nunca se borran.</p>
      <div class="scroll"><table class="t">
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
        <tbody>@for (a of lista(); track a.id) { <tr><td>{{ a.fecha.slice(0, 19).replace('T', ' ') }}</td><td>{{ a.usuario?.nombre ?? '—' }}</td><td>{{ a.accion }}</td><td>{{ a.entidad }} {{ a.entidadId }}</td><td>{{ a.detalle }}</td></tr> }</tbody>
      </table></div>
    </div>
  `,
})
export class Auditoria implements OnInit {
  private api = inject(Api);
  lista = signal<Aud[]>([]);
  ngOnInit() { this.api.get<Aud[]>('/auditoria').subscribe((l) => this.lista.set(l)); }
}
