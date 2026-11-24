import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { errorDe } from '../core/api';
import { Auth } from '../core/auth';
import { EmpresaStore } from '../core/empresa';

@Component({
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div style="display:grid;place-items:center;min-height:100vh;padding:16px">
      <mat-card style="width:100%;max-width:380px;padding:16px">
        <h1 style="margin:0 0 4px">Sistema Contable</h1>
        <p class="muted">Plan Contable General Empresarial 2019</p>
        <form [formGroup]="f" (ngSubmit)="entrar()">
          <mat-form-field><mat-label>Correo</mat-label><input matInput type="email" formControlName="email" autocomplete="username" /></mat-form-field>
          <mat-form-field><mat-label>Contraseña</mat-label><input matInput type="password" formControlName="password" autocomplete="current-password" /></mat-form-field>
          @if (error()) { <p class="falta" role="alert">{{ error() }}</p> }
          <button mat-flat-button type="submit" style="width:100%" [disabled]="f.invalid || cargando()">Entrar</button>
        </form>
      </mat-card>
    </div>
  `,
})
export class Login {
  private auth = inject(Auth);
  private router = inject(Router);
  private store = inject(EmpresaStore);
  error = signal('');
  cargando = signal(false);
  f = inject(FormBuilder).nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });

  entrar() {
    this.cargando.set(true);
    const { email, password } = this.f.getRawValue();
    this.auth.login(email, password).subscribe({
      next: async () => { await this.store.cargar(); this.router.navigateByUrl('/'); },
      error: (e) => { this.error.set(errorDe(e).mensaje); this.cargando.set(false); },
    });
  }
}

@Component({
  imports: [MatButtonModule],
  template: `<div class="pagina"><h1>Falta configurar la empresa</h1><p>Un administrador debe completar el perfil de la empresa antes de registrar operaciones.</p><button mat-flat-button (click)="auth.logout()">Cerrar sesión</button></div>`,
})
export class SinConfigurar { auth = inject(Auth); }
