import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import {
  AutomatizacionService,
  EventoOutbox,
  Plantilla,
  Recurrente,
  ResultadoRecurrente,
} from './automatizacion.service';

type SubTab = 'plantillas' | 'recurrentes' | 'eventos';

@Component({
  selector: 'app-automatizacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './automatizacion.html',
})
export class AutomatizacionComponent implements OnInit {
  private api = inject(AutomatizacionService);
  auth = inject(AuthService);

  tab = signal<SubTab>('plantillas');
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  plantillas = signal<Plantilla[]>([]);
  recurrentes = signal<Recurrente[]>([]);
  eventos = signal<EventoOutbox[]>([]);
  resultados = signal<ResultadoRecurrente[] | null>(null);

  // --- Aplicar plantilla ---
  plantillaSel = signal<Plantilla | null>(null);
  fechaAplicar = this.hoy();
  valoresAplicar: Record<string, string> = {};

  /** Variables a pedir al aplicar: importes de las líneas + textos del concepto (p. ej. {numero}). */
  variablesDe(p: Plantilla): string[] {
    const textos = [...p.concepto_formato.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    return [...new Set([...p.variables, ...textos])];
  }
  esImporte(p: Plantilla, v: string): boolean {
    return p.variables.includes(v);
  }
  variablesSel = computed(() => (this.plantillaSel() ? this.variablesDe(this.plantillaSel()!) : []));

  // --- Nueva plantilla ---
  mostrarNueva = signal(false);
  nueva = this.plantillaVacia();

  // --- Nuevo recurrente ---
  mostrarNuevoRec = signal(false);
  nuevoRec = this.recurrenteVacio();
  fechaCorte = '';
  estadoFiltro = '';

  ngOnInit() {
    this.cargarPlantillas();
  }

  cambiarTab(t: SubTab) {
    this.tab.set(t);
    this.limpiar();
    if (t === 'plantillas') this.cargarPlantillas();
    if (t === 'recurrentes') {
      this.cargarPlantillas();
      this.cargarRecurrentes();
    }
    if (t === 'eventos') this.cargarEventos();
  }

  cargarPlantillas() {
    this.api.getPlantillas().subscribe({ next: (d) => this.plantillas.set(d), error: (e) => this.fallo(e) });
  }
  cargarRecurrentes() {
    this.api.getRecurrentes().subscribe({ next: (d) => this.recurrentes.set(d), error: (e) => this.fallo(e) });
  }
  cargarEventos() {
    this.api.getEventos(this.estadoFiltro || undefined).subscribe({
      next: (d) => this.eventos.set(d),
      error: (e) => this.fallo(e),
    });
  }

  // --- Plantillas ---
  elegirPlantilla(p: Plantilla) {
    this.plantillaSel.set(p);
    this.valoresAplicar = {};
    this.limpiar();
  }

  aplicar() {
    const p = this.plantillaSel();
    if (!p) return;
    this.limpiar();
    this.api.aplicarPlantilla(p.codigo, this.fechaAplicar, this.valoresAplicar).subscribe({
      next: (a) => {
        this.exito.set(`Asiento N° ${a.partida} generado con la plantilla ${p.codigo}.`);
        this.valoresAplicar = {};
      },
      error: (e) => this.fallo(e),
    });
  }

  agregarLinea() {
    this.nueva.lineas.push({ codigo_cuenta: 0, lado: 'DEBE', variable: '', glosa: '' });
  }
  quitarLinea(i: number) {
    this.nueva.lineas.splice(i, 1);
  }

  guardarPlantilla() {
    this.limpiar();
    this.api.crearPlantilla({ ...this.nueva, lineas: this.nueva.lineas.map((l) => ({ ...l, glosa: l.glosa || null })) }).subscribe({
      next: (p) => {
        this.exito.set(`Plantilla ${p.codigo} creada.`);
        this.mostrarNueva.set(false);
        this.nueva = this.plantillaVacia();
        this.cargarPlantillas();
      },
      error: (e) => this.fallo(e),
    });
  }

  // --- Recurrentes ---
  plantillaDe(codigo: string): Plantilla | undefined {
    return this.plantillas().find((p) => p.codigo === codigo);
  }
  variablesRec(): string[] {
    const p = this.plantillaDe(this.nuevoRec.codigo_plantilla);
    return p ? this.variablesDe(p) : [];
  }
  esImporteRec(v: string): boolean {
    return !!this.plantillaDe(this.nuevoRec.codigo_plantilla)?.variables.includes(v);
  }

  guardarRecurrente() {
    this.limpiar();
    const r = this.nuevoRec;
    this.api
      .crearRecurrente({ ...r, fecha_fin: r.fecha_fin || null })
      .subscribe({
        next: (x) => {
          this.exito.set(`Recurrente "${x.nombre}" creado.`);
          this.mostrarNuevoRec.set(false);
          this.nuevoRec = this.recurrenteVacio();
          this.cargarRecurrentes();
        },
        error: (e) => this.fallo(e),
      });
  }

  desactivar(r: Recurrente) {
    this.api.desactivarRecurrente(r.id_recurrente).subscribe({
      next: () => this.cargarRecurrentes(),
      error: (e) => this.fallo(e),
    });
  }

  ejecutar() {
    this.limpiar();
    this.api.ejecutarRecurrentes(this.fechaCorte || undefined).subscribe({
      next: (res) => {
        this.resultados.set(res);
        this.cargarRecurrentes();
        if (res.length === 0) this.exito.set('No había asientos recurrentes pendientes.');
      },
      error: (e) => this.fallo(e),
    });
  }

  // --- Eventos ---
  reintentar(ev: EventoOutbox) {
    this.api.reintentarEvento(ev.id_evento).subscribe({ next: () => this.cargarEventos(), error: (e) => this.fallo(e) });
  }

  clasePeriodo(p: number): string {
    return `${String(p % 100).padStart(2, '0')}/${Math.floor(p / 100)}`;
  }

  limpiar() {
    this.error.set(null);
    this.exito.set(null);
  }

  private fallo(e: { status?: number; error?: { detalle?: string; detail?: unknown } }) {
    const d = e.error?.detalle ?? e.error?.detail;
    this.error.set(
      e.status === 403
        ? 'Su rol no tiene permiso para esta operación.'
        : typeof d === 'string'
          ? d
          : 'Ocurrió un error al procesar la solicitud.',
    );
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }
  private plantillaVacia() {
    return {
      codigo: '',
      nombre: '',
      descripcion: '' as string | null,
      tipo_asiento: 'OPERATIVO',
      concepto_formato: '',
      lineas: [
        { codigo_cuenta: 0, lado: 'DEBE' as 'DEBE' | 'HABER', variable: '', glosa: '' as string | null },
        { codigo_cuenta: 0, lado: 'HABER' as 'DEBE' | 'HABER', variable: '', glosa: '' as string | null },
      ],
    };
  }
  private recurrenteVacio() {
    return {
      nombre: '',
      codigo_plantilla: '',
      valores: {} as Record<string, string>,
      dia_del_mes: 1,
      fecha_inicio: this.hoy(),
      fecha_fin: '' as string | null,
    };
  }
}
