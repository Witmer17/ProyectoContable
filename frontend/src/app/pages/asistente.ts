import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Api, errorDe } from '../core/api';
import { Auth } from '../core/auth';
import { EmpresaStore } from '../core/empresa';
import { hoy, r2 } from '../core/util';
import { Montos } from '../shared/montos';
import { Producto, ProductoDialog } from '../shared/producto-dialog';
import { SelectorCuenta } from '../shared/selector-cuenta';
import { SelectorTercero } from '../shared/selector-tercero';
import { LineaVista, TablaAsiento } from '../shared/tabla-asiento';
import { Tercero, TipoTercero } from '../shared/tercero-dialog';

interface Tarjeta { tipo: string; titulo: string; icono: string }
interface Vista { glosa: string; notas: string[]; montos?: { base: number; igv: number; total: number }; lineas: LineaVista[]; totales: { debe: number; haber: number; cuadra: boolean } }
interface Pendiente { id: number; terceroId: number; comprobante: string; saldo: number; fecha: string }
interface Item { productoId: number | null; cantidad: number; monto: number }
interface Trab { terceroId: number | null; sueldo: number; pension: 'ONP' | 'AFP' }
interface LineaManual { cuenta: string; debe: number; haber: number }

interface Cfg {
  tercero?: TipoTercero; terceroEtiqueta?: string; comprobante?: boolean; montos?: boolean; items?: boolean; condicion?: boolean;
  mes?: boolean; fecha?: boolean; pendiente?: 'cobrar' | 'pagar'; trabajadores?: boolean; area?: boolean; concepto?: string;
  servicio?: boolean; tipoActivo?: boolean; activoVenta?: boolean; aporte?: boolean; plantilla?: boolean; manual?: boolean; honorarios?: boolean; ayuda?: string;
}

const CFG: Record<string, Cfg> = {
  COMPRA_MERCADERIA: { tercero: 'PROVEEDOR', terceroEtiqueta: 'Proveedor', comprobante: true, montos: true, items: true, condicion: true, fecha: true },
  COMPRA_ACTIVO: { tercero: 'PROVEEDOR', terceroEtiqueta: 'Proveedor', comprobante: true, montos: true, condicion: true, fecha: true, tipoActivo: true, concepto: '¿Qué bien compraste? (ej. Camioneta Hilux)' },
  PAGO_SERVICIO: { tercero: 'PROVEEDOR', terceroEtiqueta: 'Proveedor', comprobante: true, montos: true, condicion: true, fecha: true, servicio: true, area: true },
  HONORARIOS: { tercero: 'PROVEEDOR', terceroEtiqueta: 'Persona (recibo por honorarios)', comprobante: true, fecha: true, honorarios: true, area: true },
  VENTA_MERCADERIA: { tercero: 'CLIENTE', terceroEtiqueta: 'Cliente', comprobante: true, montos: true, items: true, condicion: true, fecha: true },
  VENTA_SERVICIO: { tercero: 'CLIENTE', terceroEtiqueta: 'Cliente', comprobante: true, montos: true, condicion: true, fecha: true, concepto: 'Descripción del servicio (opcional)' },
  VENTA_ACTIVO: { tercero: 'CLIENTE', terceroEtiqueta: 'Comprador', comprobante: true, montos: true, condicion: true, fecha: true, activoVenta: true },
  COBRANZA: { tercero: 'CLIENTE', terceroEtiqueta: 'Cliente', fecha: true, pendiente: 'cobrar' },
  PAGO_PROVEEDOR: { tercero: 'PROVEEDOR', terceroEtiqueta: 'Proveedor', fecha: true, pendiente: 'pagar' },
  PLANILLA: { mes: true, trabajadores: true, area: true },
  APORTE_CAPITAL: { tercero: 'SOCIO', terceroEtiqueta: 'Socio', fecha: true, aporte: true },
  DEPRECIACION: { mes: true, area: true, ayuda: 'Calcula la depreciación de todos los activos fijos activos, en línea recta.' },
  LIQUIDACION_IGV: { mes: true, ayuda: 'Compara automáticamente el IGV de ventas con el de compras del mes.' },
  ESPECIAL: { fecha: true, plantilla: true, montos: true },
  MANUAL: { fecha: true, manual: true },
};

const SERVICIOS = [
  { v: '6363', t: 'Agua', area: 'ADMINISTRACION' }, { v: '6361', t: 'Luz', area: 'ADMINISTRACION' }, { v: '6364', t: 'Teléfono e internet', area: 'ADMINISTRACION' },
  { v: '6371', t: 'Publicidad', area: 'VENTAS' }, { v: '6341', t: 'Mantenimiento', area: 'ADMINISTRACION' }, { v: '6391', t: 'Otros servicios', area: 'ADMINISTRACION' },
];
const ACTIVOS = [
  { v: '3341', t: 'Vehículo' }, { v: '3351', t: 'Mueble o enseres' }, { v: '336', t: 'Equipo diverso (computadoras, etc.)' }, { v: '333', t: 'Maquinaria y equipo' }, { v: '332', t: 'Edificación' },
];
const PLANTILLAS = [
  { v: 'PRESTAMO', t: 'Préstamo recibido', montos: false }, { v: 'CUOTA_PRESTAMO', t: 'Pago de cuota de préstamo (capital + interés)', montos: false },
  { v: 'ANTICIPO_CLIENTE', t: 'Anticipo recibido de un cliente', montos: true }, { v: 'ANTICIPO_PROVEEDOR', t: 'Anticipo dado a un proveedor', montos: false },
  { v: 'NOTA_CREDITO', t: 'Nota de crédito emitida (devolución de venta)', montos: true }, { v: 'REBAJA', t: 'Rebaja concedida a un cliente', montos: true },
  { v: 'DEVOLUCION_COMPRA', t: 'Devolución de una compra', montos: true }, { v: 'DIVIDENDOS', t: 'Dividendos acordados', montos: false }, { v: 'PAGO_DIVIDENDOS', t: 'Pago de dividendos', montos: false },
];
const COMPROBANTES = [
  { v: '01', t: 'Factura' }, { v: '03', t: 'Boleta de venta' }, { v: '07', t: 'Nota de crédito' }, { v: '08', t: 'Nota de débito' }, { v: 'OT', t: 'Otro comprobante' },
];

const finDeMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
};

@Component({
  selector: 'app-asistente',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatExpansionModule, MatSlideToggleModule, SelectorTercero, SelectorCuenta, Montos, TablaAsiento],
  template: `
    <div class="pagina">
      <h1>Registrar una operación</h1>
      <p class="muted" aria-live="polite">Paso {{ paso() }} de 4 · {{ ['', 'Elegir la operación', 'Llenar el formulario', 'Revisar', 'Confirmar'][paso()] }}</p>

      @if (paso() === 1) {
        <div class="tarjetas">
          @for (t of catalogo(); track t.tipo) {
            <button type="button" class="tarjeta-op" (click)="elegir(t)"><mat-icon>{{ t.icono }}</mat-icon><strong>{{ t.titulo }}</strong></button>
          }
        </div>
      }

      @if (paso() === 2 && cfg(); as c) {
        <mat-card style="padding:16px">
          <h2>{{ titulo() }}</h2>
          @if (c.ayuda) { <p class="muted">{{ c.ayuda }}</p> }
          <form [formGroup]="f">
            @if (c.mes) {
              <mat-form-field><mat-label>Mes</mat-label><input matInput type="month" formControlName="mes" /></mat-form-field>
              @if (err('fecha')) { <div class="falta" role="alert">{{ err('fecha') }}</div> }
            }
            @if (c.tercero) {
              <app-selector-tercero [tipo]="c.tercero" [etiqueta]="c.terceroEtiqueta ?? 'Tercero'" [(terceroId)]="terceroId" [falta]="!!err('terceroId')" (terceroIdChange)="alCambiarTercero()" />
              @if (err('terceroId') && err('terceroId') !== 'Falta registrar') { <div class="falta" role="alert">{{ err('terceroId') }}</div> }
            }
            @if (c.fecha) {
              <div class="fila">
                <mat-form-field><mat-label>Fecha</mat-label><input matInput type="date" formControlName="fecha" /></mat-form-field>
              </div>
              @if (err('fecha')) { <div class="falta" role="alert">{{ err('fecha') }}</div> }
            }
            @if (c.comprobante) {
              <div class="fila">
                <mat-form-field class="angosto"><mat-label>Comprobante</mat-label>
                  <mat-select formControlName="tipoComprobante">@for (x of comprobantes; track x.v) { <mat-option [value]="x.v">{{ x.t }}</mat-option> }</mat-select>
                </mat-form-field>
                <mat-form-field class="angosto"><mat-label>Serie (ej. F001)</mat-label><input matInput formControlName="serie" autocomplete="off" /></mat-form-field>
                <mat-form-field class="angosto"><mat-label>Número (ej. 000123)</mat-label><input matInput formControlName="numero" inputmode="numeric" autocomplete="off" /></mat-form-field>
              </div>
              @if (err('serie')) { <div class="falta" role="alert">{{ err('serie') }}</div> }
              @if (err('numero')) { <div class="falta" role="alert">{{ err('numero') }}</div> }
            }
            @if (c.honorarios) {
              <div class="fila">
                <mat-form-field class="angosto"><mat-label>Serie (ej. E001)</mat-label><input matInput formControlName="serie" /></mat-form-field>
                <mat-form-field class="angosto"><mat-label>N.º de recibo</mat-label><input matInput formControlName="numero" inputmode="numeric" /></mat-form-field>
                <mat-form-field class="angosto"><mat-label>Monto bruto (S/)</mat-label><input matInput type="number" step="0.01" min="0" formControlName="montoBruto" /></mat-form-field>
              </div>
              @if (err('serie')) { <div class="falta" role="alert">{{ err('serie') }}</div> }
              @if (err('numero')) { <div class="falta" role="alert">{{ err('numero') }}</div> }
              @if (err('monto')) { <div class="falta" role="alert">{{ err('monto') }}</div> }
              <mat-slide-toggle formControlName="pagado">Ya pagué este recibo</mat-slide-toggle>
              @if (f.value.pagado) {
                <mat-button-toggle-group formControlName="medio" aria-label="Medio de pago"><mat-button-toggle value="EFECTIVO">Efectivo</mat-button-toggle><mat-button-toggle value="BANCO">Banco</mat-button-toggle></mat-button-toggle-group>
              }
            }
            @if (c.servicio) {
              <mat-form-field><mat-label>Tipo de servicio</mat-label>
                <mat-select [value]="cuenta()" (selectionChange)="elegirServicio($event.value)">@for (s of servicios; track s.v) { <mat-option [value]="s.v">{{ s.t }}</mat-option> }</mat-select>
              </mat-form-field>
              @if (err('cuenta')) { <div class="falta" role="alert">{{ err('cuenta') }}</div> }
            }
            @if (c.tipoActivo) {
              <div class="fila">
                <mat-form-field><mat-label>Tipo de activo</mat-label>
                  <mat-select [value]="cuenta()" (selectionChange)="cuenta.set($event.value)">@for (a of tiposActivo; track a.v) { <mat-option [value]="a.v">{{ a.t }}</mat-option> }</mat-select>
                </mat-form-field>
                <mat-form-field><mat-label>{{ c.concepto }}</mat-label><input matInput formControlName="concepto" /></mat-form-field>
              </div>
              @if (err('concepto')) { <div class="falta" role="alert">{{ err('concepto') }}</div> }
              @if (err('cuenta')) { <div class="falta" role="alert">{{ err('cuenta') }}</div> }
            }
            @if (c.activoVenta) {
              <mat-form-field><mat-label>Bien que vendes</mat-label>
                <mat-select [value]="activoId()" (selectionChange)="activoId.set($event.value)">@for (a of activos(); track a.id) { <mat-option [value]="a.id">{{ a.nombre }} · costo {{ a.valor }} · depreciado {{ a.depreciado }}</mat-option> }</mat-select>
              </mat-form-field>
              @if (err('activoId')) { <div class="falta" role="alert">{{ err('activoId') }}</div> }
            }
            @if (c.area) {
              <mat-form-field><mat-label>¿Quién usa este gasto?</mat-label>
                <mat-select formControlName="area">
                  <mat-option value="ADMINISTRACION">Oficina o administración (94)</mat-option>
                  <mat-option value="VENTAS">Ventas, publicidad o reparto (95)</mat-option>
                  <mat-option value="FINANCIERO">Préstamos o intereses (97)</mat-option>
                  @if (store.modulos()?.industrial) { <mat-option value="PRODUCCION">Fábrica o producción (92)</mat-option> }
                </mat-select>
                <mat-hint>Por defecto: oficina o administración, salvo publicidad.</mat-hint>
              </mat-form-field>
            }
            @if (c.pendiente) {
              <mat-form-field [class.rojo]="!!err('documentoId')"><mat-label>{{ c.pendiente === 'cobrar' ? 'Factura pendiente que te pagaron' : 'Factura pendiente que vas a pagar' }}</mat-label>
                <mat-select [value]="documentoId()" (selectionChange)="elegirDocumento($event.value)">
                  @for (d of pendientesDe(); track d.id) { <mat-option [value]="d.id">{{ d.comprobante }} · saldo S/ {{ d.saldo }}</mat-option> }
                </mat-select>
              </mat-form-field>
              @if (err('documentoId')) { <div class="falta" role="alert">{{ err('documentoId') }}</div> }
              <div class="fila">
                <mat-form-field class="angosto"><mat-label>Monto (S/)</mat-label><input matInput type="number" step="0.01" min="0" formControlName="monto" /></mat-form-field>
              </div>
              @if (err('monto')) { <div class="falta" role="alert">{{ err('monto') }}</div> }
              <mat-button-toggle-group formControlName="medio" aria-label="Medio"><mat-button-toggle value="EFECTIVO">Efectivo</mat-button-toggle><mat-button-toggle value="BANCO">Banco</mat-button-toggle></mat-button-toggle-group>
              <div class="muted">Por defecto: efectivo, porque no indicaste otro medio.</div>
              @if (f.value.medio === 'BANCO') { <mat-form-field><mat-label>Cuenta bancaria</mat-label><input matInput formControlName="cuentaBancaria" /></mat-form-field> @if (err('cuentaBancaria')) { <div class="falta" role="alert">{{ err('cuentaBancaria') }}</div> } }
            }
            @if (c.aporte) {
              <mat-form-field><mat-label>Tipo de aporte</mat-label>
                <mat-select formControlName="tipoAporte">
                  <mat-option value="DINERO">Aporte en dinero</mat-option><mat-option value="BIEN">Aporte en bienes</mat-option>
                  <mat-option value="SUSCRIPCION">Suscripción de acciones (pendiente de pago)</mat-option><mat-option value="PAGO_SUSCRIPCION">Pago de una suscripción</mat-option>
                </mat-select>
              </mat-form-field>
              @if (f.value.tipoAporte === 'BIEN') { <app-selector-cuenta [(codigo)]="cuenta" etiqueta="Cuenta del bien aportado" /> @if (err('cuenta')) { <div class="falta" role="alert">{{ err('cuenta') }}</div> } }
              <mat-slide-toggle formControlName="aumento">Es un aumento de capital (va a 5221)</mat-slide-toggle>
              <div class="fila" style="margin-top:8px">
                <mat-form-field><mat-label>Monto (S/)</mat-label><input matInput type="number" step="0.01" min="0" formControlName="monto" /></mat-form-field>
                @if (f.value.tipoAporte === 'DINERO' || f.value.tipoAporte === 'PAGO_SUSCRIPCION') {
                  <mat-form-field><mat-label>Medio</mat-label><mat-select formControlName="medio"><mat-option value="BANCO">Banco</mat-option><mat-option value="EFECTIVO">Efectivo</mat-option></mat-select><mat-hint>Por defecto: banco.</mat-hint></mat-form-field>
                }
              </div>
              @if (err('monto')) { <div class="falta" role="alert">{{ err('monto') }}</div> }
            }
            @if (c.plantilla) {
              <mat-form-field><mat-label>¿Qué operación?</mat-label>
                <mat-select formControlName="plantilla">@for (p of plantillas; track p.v) { <mat-option [value]="p.v">{{ p.t }}</mat-option> }</mat-select>
              </mat-form-field>
              @if (err('plantilla')) { <div class="falta" role="alert">{{ err('plantilla') }}</div> }
              <app-selector-tercero tipo="CLIENTE" etiqueta="Cliente (opcional)" [(terceroId)]="terceroId" />
              @if (f.value.plantilla === 'CUOTA_PRESTAMO') {
                <div class="fila"><mat-form-field><mat-label>Interés incluido (S/)</mat-label><input matInput type="number" step="0.01" min="0" formControlName="interes" /></mat-form-field></div>
              }
              @if (!conIgv()) {
                <div class="fila">
                  <mat-form-field><mat-label>Monto (S/)</mat-label><input matInput type="number" step="0.01" min="0" formControlName="monto" /></mat-form-field>
                  <mat-form-field><mat-label>Medio</mat-label><mat-select formControlName="medio"><mat-option value="BANCO">Banco</mat-option><mat-option value="EFECTIVO">Efectivo</mat-option></mat-select></mat-form-field>
                </div>
              }
              @if (err('monto')) { <div class="falta" role="alert">{{ err('monto') }}</div> }
            }

            @if (c.items) {
              <h3>Productos</h3>
              @for (it of items(); track $index; let i = $index) {
                <div class="fila" style="align-items:center">
                  <mat-form-field style="flex:2 1 220px" [class.rojo]="!it.productoId && tocadoItems()"><mat-label>Producto</mat-label>
                    <mat-select [value]="it.productoId" (selectionChange)="editarItem(i, { productoId: $event.value })">@for (p of productos(); track p.id) { <mat-option [value]="p.id">{{ p.codigo }} · {{ p.nombre }} (stock {{ p.stock }})</mat-option> }</mat-select>
                  </mat-form-field>
                  <mat-form-field class="angosto"><mat-label>Cantidad</mat-label><input matInput type="number" min="0" [value]="it.cantidad" (input)="editarItem(i, { cantidad: +$any($event.target).value })" /></mat-form-field>
                  <mat-form-field class="angosto"><mat-label>{{ montos()?.modo() === 'MAS' ? 'Importe sin IGV' : 'Importe' }}</mat-label><input matInput type="number" min="0" step="0.01" [value]="it.monto" (input)="editarItem(i, { monto: +$any($event.target).value })" /></mat-form-field>
                  <button mat-icon-button type="button" (click)="quitarItem(i)" aria-label="Quitar producto"><mat-icon>delete</mat-icon></button>
                </div>
              }
              @if (!productos().length) { <div class="falta">Falta registrar un producto</div> }
              <div class="acciones" style="margin-top:0">
                <button mat-stroked-button type="button" (click)="agregarItem()"><mat-icon>add</mat-icon> Agregar producto</button>
                <button mat-stroked-button type="button" (click)="nuevoProducto()"><mat-icon>add</mat-icon> Nuevo producto</button>
              </div>
              @if (err('items')) { <div class="falta" role="alert">{{ err('items') }}</div> }
              <p class="muted">Sin productos, se registra solo por concepto y no se mueve el kárdex.</p>
            }

            @if (c.montos) {
              <h3>Montos</h3>
              @if (store.modulos()?.dolares && c.comprobante) {
                <div class="fila">
                  <mat-form-field class="angosto"><mat-label>Moneda</mat-label><mat-select formControlName="moneda"><mat-option value="PEN">Soles</mat-option><mat-option value="USD">Dólares</mat-option></mat-select></mat-form-field>
                  @if (f.value.moneda === 'USD') { <mat-form-field class="angosto"><mat-label>Tipo de cambio</mat-label><input matInput type="number" step="0.001" formControlName="tipoCambio" /></mat-form-field> }
                </div>
                @if (err('tipoCambio')) { <div class="falta" role="alert">{{ err('tipoCambio') }}</div> }
              }
              <app-montos #montosRef [soloLectura]="c.items! && items().length > 0" [moneda]="f.value.moneda ?? 'PEN'" [tasa]="store.empresa()?.igvTasa ?? 0.18"
                [(modo)]="modo" [(base)]="base" [(igv)]="igv" [(total)]="total" [(manual)]="igvManual" (modoChange)="recalcularItems()" />
              @if (err('monto')) { <div class="falta" role="alert">{{ err('monto') }}</div> }
              @if (err('igv')) { <div class="falta" role="alert">{{ err('igv') }}</div> }
            }

            @if (c.condicion) {
              <h3>¿Cómo se paga?</h3>
              <mat-button-toggle-group formControlName="condicion" aria-label="Condición de pago">
                <mat-button-toggle value="CONTADO_EFECTIVO">Contado en efectivo</mat-button-toggle>
                <mat-button-toggle value="CONTADO_BANCO">Contado por banco</mat-button-toggle>
                <mat-button-toggle value="CREDITO">Crédito</mat-button-toggle>
              </mat-button-toggle-group>
              @if (f.value.condicion === 'CONTADO_BANCO') {
                <mat-form-field><mat-label>Cuenta bancaria</mat-label><input matInput formControlName="cuentaBancaria" /></mat-form-field>
                @if (err('cuentaBancaria')) { <div class="falta" role="alert">{{ err('cuentaBancaria') }}</div> }
              }
              @if (f.value.condicion === 'CREDITO') {
                <mat-form-field><mat-label>Fecha de vencimiento</mat-label><input matInput type="date" formControlName="vencimiento" /><mat-hint>Si no la indicas, vence a los 30 días.</mat-hint></mat-form-field>
              }
            }

            @if (c.trabajadores) {
              <h3>Trabajadores</h3>
              @for (t of trabajadores(); track $index; let i = $index) {
                <div class="fila" style="align-items:center">
                  <mat-form-field style="flex:2 1 220px"><mat-label>Trabajador</mat-label>
                    <mat-select [value]="t.terceroId" (selectionChange)="elegirTrabajador(i, $event.value)">@for (w of listaTrabajadores(); track w.id) { <mat-option [value]="w.id">{{ w.nombre }}</mat-option> }</mat-select>
                  </mat-form-field>
                  <mat-form-field class="angosto"><mat-label>Sueldo</mat-label><input matInput type="number" min="0" [value]="t.sueldo" (input)="editarTrab(i, { sueldo: +$any($event.target).value })" /></mat-form-field>
                  <mat-form-field class="angosto"><mat-label>Pensión</mat-label><mat-select [value]="t.pension" (selectionChange)="editarTrab(i, { pension: $event.value })"><mat-option value="ONP">ONP</mat-option><mat-option value="AFP">AFP</mat-option></mat-select></mat-form-field>
                  <button mat-icon-button type="button" (click)="quitarTrab(i)" aria-label="Quitar"><mat-icon>delete</mat-icon></button>
                </div>
              }
              <div class="acciones" style="margin-top:0">
                <button mat-stroked-button type="button" (click)="trabajadores.update(l => [...l, { terceroId: null, sueldo: 0, pension: 'ONP' }])"><mat-icon>add</mat-icon> Agregar trabajador</button>
                <app-selector-tercero tipo="TRABAJADOR" etiqueta="Crear trabajador nuevo" (terceroIdChange)="trabajadorCreado($event)" />
              </div>
              <div class="muted">Aportes por defecto: ESSALUD 9 % y ONP 13 %.</div>
              @if (err('trabajadores')) { <div class="falta" role="alert">{{ err('trabajadores') }}</div> }
            }

            @if (c.manual) {
              <h3>Líneas del asiento</h3>
              @for (l of lineasManual(); track $index; let i = $index) {
                <div class="fila" style="align-items:flex-start">
                  <div style="flex:3 1 340px"><app-selector-cuenta [codigo]="l.cuenta" (codigoChange)="editarLinea(i, { cuenta: $event })" /></div>
                  <mat-form-field class="angosto"><mat-label>Debe</mat-label><input matInput type="number" min="0" step="0.01" [value]="l.debe || ''" (input)="editarLinea(i, { debe: +$any($event.target).value, haber: 0 })" /></mat-form-field>
                  <mat-form-field class="angosto"><mat-label>Haber</mat-label><input matInput type="number" min="0" step="0.01" [value]="l.haber || ''" (input)="editarLinea(i, { haber: +$any($event.target).value, debe: 0 })" /></mat-form-field>
                  <button mat-icon-button type="button" (click)="lineasManual.update(ls => ls.filter((_, k) => k !== i))" aria-label="Quitar línea"><mat-icon>delete</mat-icon></button>
                </div>
              }
              <button mat-stroked-button type="button" (click)="lineasManual.update(ls => [...ls, { cuenta: '', debe: 0, haber: 0 }])"><mat-icon>add</mat-icon> Agregar línea</button>
              <div style="margin-top:8px"><span [class]="manualCuadra() ? 'cuadra' : 'nocuadra'">{{ manualCuadra() ? 'Cuadra' : 'No cuadra, revisa los montos' }}</span></div>
              <mat-form-field style="margin-top:8px"><mat-label>Glosa</mat-label><input matInput formControlName="glosa" /></mat-form-field>
              @if (err('glosa')) { <div class="falta" role="alert">{{ err('glosa') }}</div> }
            }
            @if (err('lineas')) { <div class="falta" role="alert">{{ err('lineas') }}</div> }

            @if (c.montos || c.items || c.servicio || c.tipoActivo) {
              <mat-expansion-panel style="margin-top:12px">
                <mat-expansion-panel-header>Más opciones</mat-expansion-panel-header>
                <app-selector-cuenta [(codigo)]="cuentaAvanzada" [grupo]="grupoCuenta()" etiqueta="Cuenta (déjala vacía para usar la sugerida)" />
              </mat-expansion-panel>
            }
          </form>
          @if (errorGeneral()) { <p class="falta" role="alert">{{ errorGeneral() }}</p> }
          <div class="acciones">
            <button mat-button type="button" (click)="paso.set(1)">Atrás</button>
            <button mat-flat-button type="button" (click)="revisar()" [disabled]="cargando()">Revisar asientos</button>
          </div>
        </mat-card>
      }

      @if (paso() === 3 && vista(); as v) {
        <mat-card style="padding:16px">
          <h2>Revisa antes de guardar</h2>
          <p><strong>{{ v.glosa }}</strong></p>
          @if (v.montos) { <p>Base S/ {{ v.montos.base }} · IGV S/ {{ v.montos.igv }} · Total S/ {{ v.montos.total }}</p> }
          @for (n of v.notas; track n) { <div class="nota">{{ n }}</div> }
          <app-tabla-asiento [lineas]="v.lineas" [debe]="v.totales.debe" [haber]="v.totales.haber" [cuadra]="v.totales.cuadra" />
          @if (errorGeneral()) { <p class="falta" role="alert">{{ errorGeneral() }}</p> }
          <div class="acciones">
            <button mat-button type="button" (click)="paso.set(2)">Corregir</button>
            <button mat-flat-button type="button" (click)="confirmar()" [disabled]="!v.totales.cuadra || cargando()">Confirmar y guardar</button>
          </div>
        </mat-card>
      }

      @if (paso() === 4) {
        <mat-card style="padding:16px">
          <h2><mat-icon style="vertical-align:middle;color:#16a34a">check_circle</mat-icon> Asiento N.º {{ guardado()?.numero }} guardado</h2>
          <div class="acciones">
            @if (auth.registra()) { <button mat-flat-button type="button" (click)="otraIgual()">Registrar otra igual</button> }
            <button mat-stroked-button type="button" (click)="reiniciar()">Otra operación</button>
            <a mat-button routerLink="/asientos">Ver diario</a>
          </div>
        </mat-card>
      }
    </div>
  `,
})
export class Asistente implements OnInit {
  private api = inject(Api);
  private dialog = inject(MatDialog);
  auth = inject(Auth);
  store = inject(EmpresaStore);
  private fb = inject(FormBuilder).nonNullable;

  servicios = SERVICIOS;
  tiposActivo = ACTIVOS;
  plantillas = PLANTILLAS;
  comprobantes = COMPROBANTES;

  paso = signal(1);
  catalogo = signal<Tarjeta[]>([]);
  tipo = signal('');
  cfg = computed(() => CFG[this.tipo()]);
  titulo = computed(() => this.catalogo().find((t) => t.tipo === this.tipo())?.titulo ?? '');
  montos = viewChild<Montos>('montosRef');

  f = this.fb.group({
    fecha: [hoy()], mes: [hoy().slice(0, 7)], tipoComprobante: ['01'], serie: [''], numero: [''], moneda: ['PEN'], tipoCambio: [0],
    condicion: ['CONTADO_EFECTIVO'], cuentaBancaria: [''], vencimiento: [''], area: ['ADMINISTRACION'], concepto: [''], medio: ['EFECTIVO'], pagado: [false],
    montoBruto: [0], monto: [0], tipoAporte: ['DINERO'], aumento: [false], plantilla: [''], interes: [0], glosa: [''],
  });
  terceroId = signal<number | null>(null);
  cuenta = signal('');
  cuentaAvanzada = signal('');
  documentoId = signal<number | null>(null);
  activoId = signal<number | null>(null);
  modo = signal<'INCLUYE' | 'MAS' | 'SIN'>('INCLUYE');
  base = signal(0);
  igv = signal(0);
  total = signal(0);
  igvManual = signal(false);
  items = signal<Item[]>([]);
  tocadoItems = signal(false);
  trabajadores = signal<Trab[]>([]);
  lineasManual = signal<LineaManual[]>([{ cuenta: '', debe: 0, haber: 0 }, { cuenta: '', debe: 0, haber: 0 }]);

  productos = signal<Producto[]>([]);
  listaTrabajadores = signal<Tercero[]>([]);
  pendientes = signal<Pendiente[]>([]);
  activos = signal<{ id: number; nombre: string; valor: number; depreciado: number; estado: string }[]>([]);
  pendientesDe = computed(() => this.pendientes().filter((p) => !this.terceroId() || p.terceroId === this.terceroId()));

  errores = signal<Record<string, string>>({});
  errorGeneral = signal('');
  vista = signal<Vista | null>(null);
  guardado = signal<{ numero: number } | null>(null);
  cargando = signal(false);

  conIgv = computed(() => ['NOTA_CREDITO', 'REBAJA', 'DEVOLUCION_COMPRA', 'ANTICIPO_CLIENTE'].includes(this.f.value.plantilla ?? ''));
  grupoCuenta = computed(() => ({ COMPRA_MERCADERIA: '60', PAGO_SERVICIO: '63', COMPRA_ACTIVO: '33', VENTA_MERCADERIA: '70', VENTA_SERVICIO: '70' } as Record<string, string>)[this.tipo()] ?? '');
  manualCuadra = computed(() => {
    const ls = this.lineasManual();
    const d = r2(ls.reduce((s, l) => s + (l.debe || 0), 0)), h = r2(ls.reduce((s, l) => s + (l.haber || 0), 0));
    return d === h && d > 0;
  });

  ngOnInit() {
    this.api.get<Tarjeta[]>('/operaciones/catalogo').subscribe((c) => this.catalogo.set(c));
  }

  err = (campo: string) => this.errores()[campo] ?? '';

  elegir(t: Tarjeta) {
    this.tipo.set(t.tipo);
    this.reiniciarCampos();
    const c = CFG[t.tipo];
    if (c.items) this.api.get<Producto[]>('/productos').subscribe((p) => { this.productos.set(p); if (!this.items().length) this.agregarItem(); });
    if (c.trabajadores) this.api.get<Tercero[]>('/terceros', { tipo: 'TRABAJADOR' }).subscribe((l) => this.listaTrabajadores.set(l));
    if (c.pendiente) this.api.get<{ filas: Pendiente[] }>(`/reportes/pendientes/${c.pendiente === 'cobrar' ? 'por-cobrar' : 'por-pagar'}`).subscribe((r) => this.pendientes.set(r.filas));
    if (c.activoVenta) this.api.get<any[]>('/activos').subscribe((a) => this.activos.set(a.filter((x) => x.estado === 'ACTIVO')));
    if (t.tipo === 'COMPRA_ACTIVO') this.f.patchValue({ condicion: 'CREDITO' });
    if (t.tipo === 'COMPRA_ACTIVO') this.cuenta.set('3351');
    if (t.tipo === 'PAGO_SERVICIO') this.elegirServicio('6363');
    this.paso.set(2);
  }

  private reiniciarCampos(conservar = false) {
    const v = this.f.value;
    this.f.reset({ fecha: hoy(), mes: hoy().slice(0, 7), tipoComprobante: '01', serie: '', numero: '', moneda: 'PEN', tipoCambio: 0, condicion: conservar ? v.condicion : 'CONTADO_EFECTIVO', cuentaBancaria: conservar ? v.cuentaBancaria : '', vencimiento: '', area: conservar ? v.area : 'ADMINISTRACION', concepto: '', medio: conservar ? v.medio : 'EFECTIVO', pagado: false, montoBruto: 0, monto: 0, tipoAporte: 'DINERO', aumento: false, plantilla: '', interes: 0, glosa: '' });
    if (!conservar) { this.terceroId.set(null); this.cuenta.set(''); this.cuentaAvanzada.set(''); }
    this.documentoId.set(null); this.activoId.set(null);
    this.modo.set('INCLUYE'); this.base.set(0); this.igv.set(0); this.total.set(0); this.igvManual.set(false);
    this.items.set([]); this.trabajadores.set([]); this.errores.set({}); this.errorGeneral.set(''); this.vista.set(null);
  }

  // ── Productos ──
  agregarItem() { this.items.update((l) => [...l, { productoId: null, cantidad: 1, monto: 0 }]); }
  quitarItem(i: number) { this.items.update((l) => l.filter((_, k) => k !== i)); this.recalcularItems(); }
  editarItem(i: number, cambio: Partial<Item>) { this.tocadoItems.set(true); this.items.update((l) => l.map((x, k) => (k === i ? { ...x, ...cambio } : x))); this.recalcularItems(); }
  /** Con productos, el total del documento sale de la suma de los importes. */
  recalcularItems() {
    const its = this.items();
    if (!its.length || !this.cfg()?.montos) return;
    const suma = r2(its.reduce((s, x) => s + (x.monto || 0), 0));
    setTimeout(() => this.montos()?.fijarPrimario(suma));
  }
  nuevoProducto() {
    this.dialog.open<ProductoDialog, void, Producto>(ProductoDialog, { width: '420px' }).afterClosed().subscribe((p) => {
      if (!p) return;
      this.productos.update((l) => [...l, p]);
      const vacio = this.items().findIndex((x) => !x.productoId);
      if (vacio >= 0) this.editarItem(vacio, { productoId: p.id }); else this.items.update((l) => [...l, { productoId: p.id, cantidad: 1, monto: 0 }]);
    });
  }

  // ── Planilla ──
  elegirTrabajador(i: number, id: number) {
    const w = this.listaTrabajadores().find((x) => x.id === id);
    this.editarTrab(i, { terceroId: id, sueldo: w?.sueldo ? Number(w.sueldo) : 0, pension: (w?.pension as 'ONP' | 'AFP') ?? 'ONP' });
  }
  editarTrab(i: number, c: Partial<Trab>) { this.trabajadores.update((l) => l.map((x, k) => (k === i ? { ...x, ...c } : x))); }
  quitarTrab(i: number) { this.trabajadores.update((l) => l.filter((_, k) => k !== i)); }
  trabajadorCreado(id: number | null) {
    if (!id) return;
    this.api.get<Tercero[]>('/terceros', { tipo: 'TRABAJADOR' }).subscribe((l) => {
      this.listaTrabajadores.set(l);
      this.trabajadores.update((t) => [...t, { terceroId: null, sueldo: 0, pension: 'ONP' }]);
      this.elegirTrabajador(this.trabajadores().length - 1, id);
    });
  }

  editarLinea(i: number, c: Partial<LineaManual>) { this.lineasManual.update((l) => l.map((x, k) => (k === i ? { ...x, ...c } : x))); }
  elegirServicio(v: string) { this.cuenta.set(v); this.f.patchValue({ area: SERVICIOS.find((s) => s.v === v)?.area ?? 'ADMINISTRACION' }); }

  alCambiarTercero() { this.documentoId.set(null); }
  elegirDocumento(id: number) {
    this.documentoId.set(id);
    const d = this.pendientes().find((x) => x.id === id);
    if (d) this.f.patchValue({ monto: d.saldo });
  }

  // ── Armado y envío ──
  private payload(): Record<string, unknown> {
    const v = this.f.getRawValue();
    const c = this.cfg();
    const t = this.tipo();
    const p: Record<string, unknown> = { tipo: t, fecha: c.mes ? finDeMes(v.mes) : v.fecha };
    if (c.tercero || c.plantilla) p['terceroId'] = this.terceroId() ?? undefined;
    if (c.comprobante || c.honorarios) Object.assign(p, { tipoComprobante: c.honorarios ? 'RH' : v.tipoComprobante, serie: v.serie, numero: v.numero });
    const cuenta = this.cuentaAvanzada() || this.cuenta();
    if (cuenta) p['cuenta'] = cuenta;
    if (c.montos && !c.plantilla) {
      const m = this.montos();
      p['modoIgv'] = this.modo();
      p['monto'] = m ? m.monto() : this.total();
      if (this.igvManual() && !this.items().length) p['igvManual'] = this.igv();
      if (v.moneda === 'USD') Object.assign(p, { moneda: 'USD', tipoCambio: v.tipoCambio || undefined });
    }
    if (c.items) p['items'] = this.items().filter((i) => i.productoId).map((i) => ({ productoId: i.productoId, cantidad: i.cantidad, monto: i.monto }));
    if (c.condicion) Object.assign(p, { condicion: v.condicion, cuentaBancaria: v.cuentaBancaria || undefined, vencimiento: v.vencimiento || undefined });
    if (c.area) p['area'] = v.area;
    if (c.concepto !== undefined && v.concepto) p['concepto'] = v.concepto;
    if (c.honorarios) Object.assign(p, { monto: v.montoBruto, pagado: v.pagado, medio: v.pagado ? v.medio : undefined });
    if (c.pendiente) Object.assign(p, { documentoId: this.documentoId() ?? undefined, monto: v.monto, medio: v.medio, cuentaBancaria: v.cuentaBancaria || undefined });
    if (c.activoVenta) p['activoId'] = this.activoId() ?? undefined;
    if (c.trabajadores) p['trabajadores'] = this.trabajadores().filter((x) => x.terceroId).map((x) => ({ terceroId: x.terceroId, sueldo: x.sueldo, pension: x.pension }));
    if (c.aporte) Object.assign(p, { tipoAporte: v.tipoAporte, aumento: v.aumento, monto: v.monto, medio: v.medio });
    if (c.plantilla) {
      Object.assign(p, { plantilla: v.plantilla || undefined, medio: v.medio, interes: v.interes });
      if (this.conIgv()) { const m = this.montos(); p['modoIgv'] = this.modo(); p['monto'] = m ? m.monto() : this.total(); } else { p['monto'] = v.monto; p['modoIgv'] = 'SIN'; }
    }
    if (c.manual) { p['glosa'] = v.glosa; p['lineas'] = this.lineasManual().filter((l) => l.cuenta).map((l) => ({ cuenta: l.cuenta, debe: l.debe || 0, haber: l.haber || 0 })); }
    return p;
  }

  private mostrarError(e: unknown, volver: boolean) {
    const er = errorDe(e);
    this.cargando.set(false);
    if (er.campo) this.errores.set({ [er.campo === 'mes' ? 'fecha' : er.campo]: er.mensaje }); else this.errorGeneral.set(er.mensaje);
    if (volver) this.paso.set(2);
  }

  revisar() {
    this.errores.set({}); this.errorGeneral.set(''); this.cargando.set(true);
    this.api.post<Vista>('/operaciones/previsualizar', this.payload()).subscribe({
      next: (v) => { this.vista.set(v); this.cargando.set(false); this.paso.set(3); },
      error: (e) => this.mostrarError(e, true),
    });
  }

  confirmar() {
    this.errorGeneral.set(''); this.cargando.set(true);
    this.api.post<{ numero: number }>('/operaciones', this.payload()).subscribe({
      next: (r) => { this.guardado.set(r); this.cargando.set(false); this.paso.set(4); },
      error: (e) => this.mostrarError(e, true),
    });
  }

  /** "Registrar otra igual": conserva tercero, cuenta y medio de pago; limpia comprobante e importes. */
  otraIgual() {
    this.reiniciarCampos(true);
    if (this.cfg().items) this.agregarItem();
    this.paso.set(2);
  }

  reiniciar() { this.paso.set(1); this.tipo.set(''); this.reiniciarCampos(); }
}
