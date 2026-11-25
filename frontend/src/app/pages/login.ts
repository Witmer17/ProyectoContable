import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { errorDe } from '../core/api';
import { Auth } from '../core/auth';
import { EmpresaStore } from '../core/empresa';

@Component({
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="brand-header">
          <div class="logo-circle">
            <mat-icon>account_balance</mat-icon>
          </div>
          <h1>ContaSys Pro ERP</h1>
          <p class="subtitle">Gestión Contable PCGE 2019 & Tributaria SUNAT</p>
        </div>

        <form [formGroup]="f" (ngSubmit)="entrar()" class="login-form">
          <mat-form-field appearance="outline">
            <mat-label>Correo Electrónico</mat-label>
            <input matInput type="email" formControlName="email" placeholder="admin@demo.pe" autocomplete="username" />
            <mat-icon matPrefix style="margin-right:8px; color:#64748b">email</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Contraseña</mat-label>
            <input matInput type="password" formControlName="password" placeholder="••••••••" autocomplete="current-password" />
            <mat-icon matPrefix style="margin-right:8px; color:#64748b">lock</mat-icon>
          </mat-form-field>

          @if (error()) {
            <div class="error-banner">
              <mat-icon style="font-size:18px;width:18px;height:18px">error</mat-icon>
              <span>{{ error() }}</span>
            </div>
          }

          <button mat-flat-button color="primary" type="submit" class="btn-submit" [disabled]="f.invalid || cargando()">
            @if (cargando()) {
              <span>Iniciando sesión...</span>
            } @else {
              <span>Ingresar al Sistema</span>
            }
          </button>
        </form>

        <div class="demo-users">
          <div class="demo-title">Acceso rápido para demostración:</div>
          <div class="demo-chips">
            <button type="button" class="chip" (click)="setCredenciales('admin@demo.pe', 'Demo12345')">Admin</button>
            <button type="button" class="chip" (click)="setCredenciales('contador@demo.pe', 'Demo12345')">Contador</button>
            <button type="button" class="chip" (click)="setCredenciales('auxiliar@demo.pe', 'Demo12345')">Auxiliar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: grid;
      place-items: center;
      min-height: 100vh;
      background: radial-gradient(circle at 50% 20%, #1e293b, #0f172a);
      padding: 20px;
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      background: #ffffff;
      border-radius: 16px;
      padding: 36px 30px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
    }
    .brand-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-circle {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 14px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
    }
    .logo-circle mat-icon {
      color: #ffffff;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
    .brand-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .subtitle {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 0.825rem;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .btn-submit {
      margin-top: 8px;
      height: 48px;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 8px;
      background: #2563eb !important;
    }
    .error-banner {
      background: #fee2e2;
      color: #b91c1c;
      padding: 10px 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .demo-users {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px dashed #e2e8f0;
      text-align: center;
    }
    .demo-title {
      font-size: 0.78rem;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .demo-chips {
      display: flex;
      justify-content: center;
      gap: 8px;
    }
    .chip {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 4px 12px;
      border-radius: 14px;
      font-size: 0.78rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .chip:hover {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
    }
  `],
})
export class Login {
  private auth = inject(Auth);
  private router = inject(Router);
  private store = inject(EmpresaStore);
  error = signal('');
  cargando = signal(false);
  f = inject(FormBuilder).nonNullable.group({
    email: ['admin@demo.pe', [Validators.required, Validators.email]],
    password: ['Demo12345', Validators.required]
  });

  setCredenciales(email: string, pass: string) {
    this.f.patchValue({ email, password: pass });
  }

  entrar() {
    this.cargando.set(true);
    const { email, password } = this.f.getRawValue();
    this.auth.login(email, password).subscribe({
      next: async () => {
        await this.store.cargar();
        this.router.navigateByUrl('/');
      },
      error: (e) => {
        this.error.set(errorDe(e).mensaje);
        this.cargando.set(false);
      },
    });
  }
}

@Component({
  imports: [MatButtonModule],
  template: `
    <div class="pagina">
      <h1>Falta configurar la empresa</h1>
      <p>Un administrador debe completar el perfil de la empresa antes de registrar operaciones.</p>
      <button mat-flat-button (click)="auth.logout()">Cerrar sesión</button>
    </div>
  `,
})
export class SinConfigurar {
  auth = inject(Auth);
}
