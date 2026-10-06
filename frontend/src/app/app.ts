import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContabilidadService } from './services/contabilidad.service';
import { AuthService } from './services/auth.service';
import { AutomatizacionComponent } from './automatizacion/automatizacion';
import {
  AsientoContable,
  CuentaPCGE,
  PeriodoFiscal,
  KPIsContables,
  BalanceComprobacionItem,
  CrearAsientoPayload,
  RectificarAsientoPayload,
  FacturaVentaPayload,
} from './models/contabilidad.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, AutomatizacionComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private service = inject(ContabilidadService);
  auth = inject(AuthService);

  loginUsuario = '';
  loginClave = '';
  loginError = signal<string | null>(null);

  iniciarSesion() {
    this.loginError.set(null);
    this.auth.login(this.loginUsuario, this.loginClave).subscribe({
      next: () => {
        this.loginClave = '';
        this.cargarDatosGenerales();
      },
      error: () => this.loginError.set('Usuario o contraseña incorrectos.'),
    });
  }

  cerrarSesion() {
    this.auth.logout();
  }

  // Navegación
  activeTab = signal<'dashboard' | 'asientos' | 'nuevo' | 'factura' | 'pcge' | 'periodos' | 'reportes' | 'automatizacion'>('dashboard');

  // Estados de datos
  kpis = signal<KPIsContables | null>(null);
  asientos = signal<AsientoContable[]>([]);
  cuentas = signal<CuentaPCGE[]>([]);
  periodos = signal<PeriodoFiscal[]>([]);
  balanceComprobacion = signal<BalanceComprobacionItem[]>([]);
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Asiento seleccionado para ver detalle
  asientoSeleccionado = signal<AsientoContable | null>(null);
  mostrarModalDetalle = signal<boolean>(false);
  mostrarModalRectificar = signal<boolean>(false);

  // Formulario de Rectificación
  razonRectificacion = signal<string>('');
  conceptoRectificacion = signal<string>('');
  detallesRectificacion = signal<Array<{ codigo_cuenta: number; debe: number; haber: number; observaciones: string }>>([
    { codigo_cuenta: 1212, debe: 0, haber: 0, observaciones: '' },
    { codigo_cuenta: 70121, debe: 0, haber: 0, observaciones: '' },
  ]);

  // Formulario Nuevo Asiento
  nuevoAsiento = signal<{
    fecha: string;
    concepto: string;
    tipo_asiento: string;
    codigo_moneda: number;
    tipo_cambio: number;
    usuario: string;
    observaciones: string;
    detalles: Array<{ codigo_cuenta: number; debe: number; haber: number; observaciones: string }>;
  }>({
    fecha: new Date().toISOString().substring(0, 10),
    concepto: '',
    tipo_asiento: 'OPERATIVO',
    codigo_moneda: 1,
    tipo_cambio: 1.0,
    usuario: 'contador_juana',
    observaciones: '',
    detalles: [
      { codigo_cuenta: 1212, debe: 1000.0, haber: 0.0, observaciones: 'Venta de mercaderías' },
      { codigo_cuenta: 70121, debe: 0.0, haber: 847.46, observaciones: 'Base imponible' },
      { codigo_cuenta: 40111, debe: 0.0, haber: 152.54, observaciones: 'IGV generado' },
    ],
  });

  // Cálculos en vivo de partida doble para el nuevo asiento
  totalDebeNuevo = computed(() => {
    return this.nuevoAsiento().detalles.reduce((acc, curr) => acc + (Number(curr.debe) || 0), 0);
  });

  totalHaberNuevo = computed(() => {
    return this.nuevoAsiento().detalles.reduce((acc, curr) => acc + (Number(curr.haber) || 0), 0);
  });

  diferenciaPartidaDoble = computed(() => {
    return Math.abs(this.totalDebeNuevo() - this.totalHaberNuevo());
  });

  partidaDobleValida = computed(() => {
    return this.diferenciaPartidaDoble() < 0.015 && this.totalDebeNuevo() > 0;
  });

  // Formulario Simulador de Factura
  facturaForm = signal<FacturaVentaPayload>({
    numero_factura: 'FV-001-000001',
    fecha: new Date().toISOString().substring(0, 10),
    cliente_ruc: '20123456789',
    total_venta: 1180.0,
    igv: 180.0,
    base_imponible: 1000.0,
    usuario: 'sistema_automatico',
  });

  // Filtro de catálogo PCGE
  filtroPCGE = signal<string>('');
  filtroTipoPCGE = signal<number | null>(null);

  cuentasFiltradas = computed(() => {
    const q = this.filtroPCGE().toLowerCase().trim();
    const tipo = this.filtroTipoPCGE();
    return this.cuentas().filter((c) => {
      const matchQ = !q || c.codigo.toString().includes(q) || c.nombre.toLowerCase().includes(q);
      const matchTipo = tipo === null || c.codigo_tipo === tipo;
      return matchQ && matchTipo;
    });
  });

  ngOnInit() {
    if (this.auth.logueado()) this.cargarDatosGenerales();
  }

  cargarDatosGenerales() {
    this.loading.set(true);
    this.service.getKPIs().subscribe({
      next: (data) => this.kpis.set(data),
      error: () => this.mostrarError('Error al conectar con la API REST. Asegúrese de que el backend FastAPI esté activo.'),
    });

    this.service.getAsientos().subscribe({
      next: (data) => this.asientos.set(data),
      error: () => {},
    });

    this.service.getCuentas().subscribe({
      next: (data) => this.cuentas.set(data),
      error: () => {},
    });

    this.service.getPeriodos().subscribe({
      next: (data) => this.periodos.set(data),
      error: () => {},
    });

    this.service.getBalanceComprobacion().subscribe({
      next: (data) => this.balanceComprobacion.set(data),
      complete: () => this.loading.set(false),
    });
  }

  cambiarPestana(tab: 'dashboard' | 'asientos' | 'nuevo' | 'factura' | 'pcge' | 'periodos' | 'reportes' | 'automatizacion') {
    this.activeTab.set(tab);
    this.limpiarMensajes();
    if (tab === 'asientos') {
      this.cargarAsientos();
    } else if (tab === 'pcge') {
      this.cargarCuentas();
    } else if (tab === 'reportes') {
      this.cargarReportes();
    } else if (tab === 'periodos') {
      this.cargarPeriodos();
    }
  }

  cargarAsientos() {
    this.service.getAsientos().subscribe({
      next: (data) => this.asientos.set(data),
    });
  }

  cargarCuentas() {
    this.service.getCuentas().subscribe({
      next: (data) => this.cuentas.set(data),
    });
  }

  cargarPeriodos() {
    this.service.getPeriodos().subscribe({
      next: (data) => this.periodos.set(data),
    });
  }

  cargarReportes() {
    this.service.getBalanceComprobacion().subscribe({
      next: (data) => this.balanceComprobacion.set(data),
    });
    this.service.getKPIs().subscribe({
      next: (data) => this.kpis.set(data),
    });
  }

  // --- Operaciones Asiento ---
  agregarLineaNuevoAsiento() {
    const current = this.nuevoAsiento();
    current.detalles.push({ codigo_cuenta: 101, debe: 0.0, haber: 0.0, observaciones: '' });
    this.nuevoAsiento.set({ ...current });
  }

  eliminarLineaNuevoAsiento(index: number) {
    const current = this.nuevoAsiento();
    if (current.detalles.length > 2) {
      current.detalles.splice(index, 1);
      this.nuevoAsiento.set({ ...current });
    } else {
      this.mostrarError('Un asiento contable requiere al menos 2 líneas de detalle.');
    }
  }

  guardarNuevoAsiento() {
    this.limpiarMensajes();
    if (!this.partidaDobleValida()) {
      this.mostrarError('No se puede guardar: La partida doble está desbalanceada.');
      return;
    }
    const current = this.nuevoAsiento();
    if (!current.concepto.trim()) {
      this.mostrarError('Ingrese la glosa o concepto del asiento.');
      return;
    }

    const payload: CrearAsientoPayload = {
      fecha: current.fecha,
      concepto: current.concepto,
      tipo_asiento: current.tipo_asiento,
      codigo_moneda: current.codigo_moneda,
      tipo_cambio: current.tipo_cambio,
      usuario: current.usuario,
      observaciones: current.observaciones,
      detalles: current.detalles.map((d) => ({
        codigo_cuenta: Number(d.codigo_cuenta),
        debe: Number(d.debe),
        haber: Number(d.haber),
        observaciones: d.observaciones,
      })),
    };

    this.loading.set(true);
    this.service.crearAsiento(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.mostrarExito(`¡Asiento N° ${res.partida} registrado exitosamente con estado ${res.estado}!`);
        this.cargarDatosGenerales();
        this.cambiarPestana('asientos');
      },
      error: (err) => {
        this.loading.set(false);
        this.mostrarError(err.error?.detalle || 'Error al registrar el asiento contable.');
      },
    });
  }

  // --- Detalle y Rectificación ---
  abrirDetalle(asiento: AsientoContable) {
    this.service.getAsiento(asiento.partida).subscribe({
      next: (completo) => {
        this.asientoSeleccionado.set(completo);
        this.mostrarModalDetalle.set(true);
      },
      error: () => {
        this.asientoSeleccionado.set(asiento);
        this.mostrarModalDetalle.set(true);
      },
    });
  }

  cerrarModalDetalle() {
    this.mostrarModalDetalle.set(false);
  }

  iniciarRectificacion(asiento: AsientoContable) {
    this.cerrarModalDetalle();
    this.asientoSeleccionado.set(asiento);
    this.razonRectificacion.set('');
    this.conceptoRectificacion.set(`Rectificación de Asiento #${asiento.partida}: ${asiento.concepto}`);
    this.detallesRectificacion.set(
      asiento.detalles.map((d) => ({
        codigo_cuenta: d.codigo_cuenta,
        debe: d.debe,
        haber: d.haber,
        observaciones: d.observaciones || '',
      }))
    );
    this.mostrarModalRectificar.set(true);
  }

  cerrarModalRectificar() {
    this.mostrarModalRectificar.set(false);
  }

  guardarRectificacion() {
    const asiento = this.asientoSeleccionado();
    if (!asiento) return;

    if (!this.razonRectificacion().trim()) {
      this.mostrarError('Debe ingresar la justificación técnica de la rectificación contable.');
      return;
    }

    const payload: RectificarAsientoPayload = {
      razon_rectificacion: this.razonRectificacion(),
      concepto_nuevo: this.conceptoRectificacion(),
      usuario: 'auditor_carlos',
      detalles_nuevos: this.detallesRectificacion().map((d) => ({
        codigo_cuenta: Number(d.codigo_cuenta),
        debe: Number(d.debe),
        haber: Number(d.haber),
        observaciones: d.observaciones,
      })),
    };

    this.loading.set(true);
    this.service.rectificarAsiento(asiento.partida, payload).subscribe({
      next: (nuevo) => {
        this.loading.set(false);
        this.cerrarModalRectificar();
        this.mostrarExito(
          `¡Asiento #${asiento.partida} ANULADO y reemplazado por asiento RECTIFICADO #${nuevo.partida} con auditoría registrada!`
        );
        this.cargarDatosGenerales();
      },
      error: (err) => {
        this.loading.set(false);
        this.mostrarError(err.error?.detalle || 'Error al procesar la rectificación contable.');
      },
    });
  }

  // --- Factura Simulator (End-to-End) ---
  calcularFacturaValores(total: number) {
    const current = this.facturaForm();
    const base = Math.round((total / 1.18) * 100) / 100;
    const igv = Math.round((total - base) * 100) / 100;
    this.facturaForm.set({
      ...current,
      total_venta: total,
      base_imponible: base,
      igv: igv,
    });
  }

  contabilizarFactura() {
    this.limpiarMensajes();
    const f = this.facturaForm();
    this.loading.set(true);
    this.service.emitirYContabilizarFactura(f).subscribe({
      next: (asiento) => {
        this.loading.set(false);
        this.mostrarExito(
          `¡Factura ${f.numero_factura} mapeada al PCGE y contabilizada exitosamente en Partida #${asiento.partida}! Evento publicado a SIRE.`
        );
        this.cargarDatosGenerales();
        this.cambiarPestana('asientos');
      },
      error: (err) => {
        this.loading.set(false);
        this.mostrarError(err.error?.detalle || 'Error en la contabilización automática de factura.');
      },
    });
  }

  // --- Bloqueo de Períodos ---
  cambiarEstadoPeriodo(mes: number, estado: 'ABIERTO' | 'PROVISIONAL' | 'DEFINITIVO') {
    this.limpiarMensajes();
    this.service
      .bloquearPeriodo({
        codigo_ejercicio: 2026,
        mes: mes,
        estado_bloqueo: estado,
        razon_bloqueo: `Actualización de estado de período a ${estado}`,
        usuario: 'admin_juan',
      })
      .subscribe({
        next: (p) => {
          const mesStr = String(mes).padStart(2, '0');
          this.mostrarExito(`Período ${mesStr}/2026 actualizado a estado: ${p.estado_bloqueo}`);
          this.cargarPeriodos();
          this.service.getKPIs().subscribe((k) => this.kpis.set(k));
        },
        error: (err) => this.mostrarError(err.error?.detalle || 'Error al actualizar período.'),
      });
  }

  // --- Descarga PLE SUNAT ---
  descargarPLE() {
    this.service.descargarPLEDiario(2026, 10, '20123456789').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'LE2012345678920261000050100001111.txt';
        a.click();
        window.URL.revokeObjectURL(url);
        this.mostrarExito('¡Archivo plano oficial PLE 5.1 generado y descargado para SUNAT!');
      },
      error: () => this.mostrarError('Error al generar archivo PLE para SUNAT.'),
    });
  }

  // Utilidades
  mostrarError(msg: string) {
    this.errorMessage.set(msg);
    this.successMessage.set(null);
  }

  mostrarExito(msg: string) {
    this.successMessage.set(msg);
    this.errorMessage.set(null);
  }

  limpiarMensajes() {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  getNombreCuenta(codigo: number): string {
    const c = this.cuentas().find((item) => item.codigo === Number(codigo));
    return c ? c.nombre : `Cuenta ${codigo}`;
  }
}
