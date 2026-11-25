import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Api, errorDe } from '../core/api';
import { Empresa, EmpresaStore } from '../core/empresa';
import { hoy } from '../core/util';

interface Perfil { id: string; nombre: string; descripcion: string; respuestas: { actividad: Empresa['actividad']; tienePlanilla: boolean; tieneActivos: boolean; usaDolares: boolean; recibeHonorarios: boolean } }

const ACTIVIDADES = [
  { v: 'COMERCIAL', t: 'Compra y vende mercadería', d: 'Revende productos sin transformarlos. Activa kárdex, 6011, 7012 y costo de ventas.' },
  { v: 'SERVICIOS', t: 'Presta servicios', d: 'Su ingreso viene de servicios (704). Sin kárdex ni existencias.' },
  { v: 'INDUSTRIAL', t: 'Fabrica o transforma', d: 'Compra insumos y vende lo que produce. Kárdex de insumos y productos terminados.' },
  { v: 'MIXTA', t: 'Mixta', d: 'Combina dos o más de las anteriores. En cada venta eliges el tipo de ingreso.' },
] as const;

@Component({
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="pagina">
      <h1>{{ store.empresa()?.configurada ? 'Configuración' : 'Bienvenido: configuremos tu empresa' }}</h1>

      <mat-card style="padding:16px;margin-bottom:16px">
        <h2>1. Elige un perfil</h2>
        <p class="muted">Cada perfil responde las preguntas por ti. Luego puedes ajustarlas.</p>
        <div class="tarjetas">
          @for (p of perfiles(); track p.id) {
            <button type="button" class="tarjeta-op" [style.borderColor]="perfilId() === p.id ? '#2563eb' : ''" (click)="elegirPerfil(p)">
              <strong>{{ p.nombre }}</strong><span class="muted">{{ p.descripcion }}</span>
            </button>
          }
          <button type="button" class="tarjeta-op" [style.borderColor]="perfilId() === 'PERSONALIZADO' ? '#2563eb' : ''" (click)="perfilId.set('PERSONALIZADO')">
            <strong>Personalizado</strong><span class="muted">Responde las seis preguntas tú mismo.</span>
          </button>
        </div>
      </mat-card>

      <mat-card style="padding:16px;margin-bottom:16px">
        <h2>2. Preguntas</h2>
        <h3>¿Qué hace la empresa?</h3>
        <div class="tarjetas">
          @for (a of actividades; track a.v) {
            <button type="button" class="tarjeta-op" [style.borderColor]="actividad() === a.v ? '#2563eb' : ''" (click)="actividad.set(a.v); perfilId.set(perfilId() === 'PERSONALIZADO' ? 'PERSONALIZADO' : 'PERSONALIZADO')">
              <strong>{{ a.t }}</strong><span class="muted">{{ a.d }}</span>
            </button>
          }
        </div>
        <p class="muted">Régimen tributario: en esta versión se usa el <strong>régimen general</strong> (IGV 18 % mensual y renta 29.5 %).</p>
        @for (q of preguntas; track q.k) {
          <div class="fila" style="align-items:center;margin-top:8px">
            <span style="flex:2 1 280px">{{ q.t }}</span>
            <mat-button-toggle-group [value]="resp()[q.k]" (change)="cambiar(q.k, $event.value)" [attr.aria-label]="q.t">
              <mat-button-toggle [value]="true">Sí</mat-button-toggle><mat-button-toggle [value]="false">No</mat-button-toggle>
            </mat-button-toggle-group>
          </div>
        }
        <div class="acciones">
          <button mat-flat-button (click)="guardarPerfil()" [disabled]="guardando()">Guardar perfil</button>
        </div>
        @for (a of avisos(); track a) { <div class="nota">{{ a }}</div> }
      </mat-card>

      <mat-card style="padding:16px;margin-bottom:16px">
        <h2>Datos de la empresa</h2>
        <form [formGroup]="datos" (ngSubmit)="guardarDatos()">
          <div class="fila" style="align-items:center; gap:12px; flex-wrap:wrap">
            <mat-form-field style="width:200px">
              <mat-label>RUC (11 dígitos)</mat-label>
              <input matInput formControlName="ruc" inputmode="numeric" (keyup.enter)="consultarRucEmpresa()" />
            </mat-form-field>
            <button mat-flat-button color="primary" type="button" (click)="consultarRucEmpresa()" [disabled]="consultandoRuc()" style="height:48px">
              @if (consultandoRuc()) { <mat-spinner diameter="18"></mat-spinner> } @else { <span><mat-icon>search</mat-icon> Consultar SUNAT</span> }
            </button>
            <mat-form-field style="flex:1; min-width:280px">
              <mat-label>Razón social de la empresa</mat-label>
              <input matInput formControlName="razonSocial" />
            </mat-form-field>
          </div>
          @if (errorRuc()) { <p class="falta" role="alert">{{ errorRuc() }}</p> }
          <div class="fila">
            <mat-form-field class="angosto"><mat-label>Tasa de IGV</mat-label><input matInput type="number" step="0.01" formControlName="igvTasa" /></mat-form-field>
            <mat-form-field class="angosto"><mat-label>Retención 4.ª categoría</mat-label><input matInput type="number" step="0.01" formControlName="retencionTasa" /></mat-form-field>
          </div>
          <button mat-flat-button type="submit" [disabled]="datos.invalid">Guardar datos</button>
        </form>
      </mat-card>

      @if (store.empresa()?.configurada && store.modulos()?.dolares) {
        <mat-card style="padding:16px;margin-bottom:16px">
          <h2>Tipo de cambio por fecha</h2>
          <form [formGroup]="tc" (ngSubmit)="guardarTc()" class="fila">
            <mat-form-field><mat-label>Fecha</mat-label><input matInput type="date" formControlName="fecha" /></mat-form-field>
            <mat-form-field><mat-label>Tipo de cambio</mat-label><input matInput type="number" step="0.001" formControlName="valor" /></mat-form-field>
            <button mat-flat-button type="submit" [disabled]="tc.invalid">Guardar</button>
          </form>
        </mat-card>
      }

      <mat-card style="padding:16px">
        <h2>Respaldo</h2>
        <p class="muted">Descarga toda la base de datos en un archivo.</p>
        <button mat-stroked-button (click)="respaldo()">Descargar respaldo</button>
      </mat-card>
    </div>
  `,
})
export class Configuracion implements OnInit {
  store = inject(EmpresaStore);
  private api = inject(Api);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder).nonNullable;

  actividades = ACTIVIDADES;
  preguntas = [
    { k: 'tienePlanilla', t: '¿Tiene trabajadores en planilla?' },
    { k: 'tieneActivos', t: '¿Tiene activos fijos (vehículos, muebles, equipos)?' },
    { k: 'usaDolares', t: '¿Compra o vende en dólares?' },
    { k: 'recibeHonorarios', t: '¿Recibe recibos por honorarios?' },
  ] as const;
  perfiles = signal<Perfil[]>([]);
  perfilId = signal('PERSONALIZADO');
  actividad = signal<Empresa['actividad']>('COMERCIAL');
  resp = signal<Record<string, boolean>>({ tienePlanilla: false, tieneActivos: false, usaDolares: false, recibeHonorarios: false });
  avisos = signal<string[]>([]);
  guardando = signal(false);
  consultandoRuc = signal(false);
  errorRuc = signal('');
  datos = this.fb.group({ ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]], razonSocial: ['', Validators.required], igvTasa: [0.18], retencionTasa: [0.08] });
  tc = this.fb.group({ fecha: [hoy(), Validators.required], valor: [3.4, [Validators.required, Validators.min(0.01)]] });

  ngOnInit() {
    this.api.get<Perfil[]>('/empresa/perfiles').subscribe((p) => this.perfiles.set(p));
    const e = this.store.empresa();
    if (e) {
      this.perfilId.set(e.perfil);
      this.actividad.set(e.actividad);
      this.resp.set({ tienePlanilla: e.tienePlanilla, tieneActivos: e.tieneActivos, usaDolares: e.usaDolares, recibeHonorarios: e.recibeHonorarios });
      this.datos.patchValue({ ruc: e.ruc, razonSocial: e.razonSocial, igvTasa: e.igvTasa, retencionTasa: e.retencionTasa });
    }
  }

  elegirPerfil(p: Perfil) {
    this.perfilId.set(p.id);
    this.actividad.set(p.respuestas.actividad);
    this.resp.set({ tienePlanilla: p.respuestas.tienePlanilla, tieneActivos: p.respuestas.tieneActivos, usaDolares: p.respuestas.usaDolares, recibeHonorarios: p.respuestas.recibeHonorarios });
  }

  cambiar(k: string, v: boolean) { this.resp.update((r) => ({ ...r, [k]: v })); this.perfilId.set('PERSONALIZADO'); }

  guardarPerfil() {
    this.guardando.set(true);
    this.api.put<{ empresa: Empresa; avisos: string[] }>('/empresa/perfil', { perfil: this.perfilId(), actividad: this.actividad(), ...this.resp() }).subscribe({
      next: async (r) => {
        this.avisos.set(r.avisos);
        await this.store.cargar();
        this.guardando.set(false);
        this.snack.open('Perfil guardado', 'OK', { duration: 3000 });
        if (!this.datos.value.ruc || this.datos.value.razonSocial === 'EMPRESA SIN NOMBRE') this.snack.open('Ahora completa los datos de la empresa', 'OK', { duration: 4000 });
        else if (!r.avisos.length) this.router.navigateByUrl('/');
      },
      error: (e) => { this.snack.open(errorDe(e).mensaje, 'OK', { duration: 5000 }); this.guardando.set(false); },
    });
  }

  consultarRucEmpresa() {
    const ruc = this.datos.controls.ruc.value.trim();
    if (!/^\d{11}$/.test(ruc)) {
      this.errorRuc.set('El RUC debe tener 11 dígitos numéricos');
      return;
    }
    this.consultandoRuc.set(true);
    this.errorRuc.set('');
    this.api.get<any>(`/terceros/consulta-ruc/${ruc}`).subscribe({
      next: (res) => {
        this.consultandoRuc.set(false);
        if (res.razonSocial) {
          this.datos.patchValue({ razonSocial: res.razonSocial });
          this.snack.open(`✓ SUNAT: ${res.razonSocial}`, 'OK', { duration: 3500 });
        }
      },
      error: (e) => {
        this.consultandoRuc.set(false);
        this.errorRuc.set(errorDe(e).mensaje || 'No se pudo consultar el RUC en SUNAT');
      },
    });
  }

  guardarDatos() {
    this.errorRuc.set('');
    this.api.put('/empresa/datos', this.datos.getRawValue()).subscribe({
      next: async () => { await this.store.cargar(); this.snack.open('Datos guardados', 'OK', { duration: 3000 }); },
      error: (e) => this.errorRuc.set(errorDe(e).mensaje),
    });
  }

  guardarTc() { this.api.post('/empresa/tipo-cambio', this.tc.getRawValue()).subscribe(() => this.snack.open('Tipo de cambio guardado', 'OK', { duration: 3000 })); }
  respaldo() { this.api.descargar('/respaldo', {}, `respaldo-${hoy()}.json`); }
}
