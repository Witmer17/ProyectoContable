import { Body, Controller, ForbiddenException, Get, Module, Post } from '@nestjs/common';
import { REGISTRA, Roles, CONTABLE } from '../common/roles';
import { Usuario, UsuarioJwt } from '../common/usuario.decorator';
import { AsientosModule } from '../asientos/asientos.module';
import { EmpresaModule, EmpresaService } from '../empresa/empresa.module';
import { modulosDe } from '../empresa/perfiles';
import { OperacionDto } from './operaciones.dto';
import { OperacionesService } from './operaciones.service';

// Operaciones que solo contador/administrador pueden registrar; el auxiliar solo registra documentos y pagos.
const SOLO_CONTADOR = ['PLANILLA', 'APORTE_CAPITAL', 'DEPRECIACION', 'LIQUIDACION_IGV', 'ESPECIAL', 'MANUAL', 'APERTURA'];

@Controller('operaciones')
export class OperacionesController {
  constructor(private svc: OperacionesService, private empresa: EmpresaService) {}

  /** Tarjetas del asistente de registro, ya filtradas por el perfil de la empresa. */
  @Get('catalogo') @Roles('CONTADOR', 'AUXILIAR')
  async catalogo() {
    const e = await this.empresa.obtenerOError();
    const m = modulosDe(e);
    const op = (tipo: string, titulo: string, icono: string, activa = true) => ({ tipo, titulo, icono, activa });
    return [
      op('COMPRA_MERCADERIA', e.actividad === 'INDUSTRIAL' ? 'Compré insumos' : 'Compré mercadería', 'shopping_cart', m.kardex),
      op('COMPRA_ACTIVO', 'Compré un activo', 'directions_car', m.activos),
      op('PAGO_SERVICIO', 'Pagué un servicio', 'receipt_long'),
      op('HONORARIOS', 'Recibí un recibo por honorarios', 'badge', m.honorarios),
      op('VENTA_MERCADERIA', e.actividad === 'INDUSTRIAL' ? 'Vendí productos' : 'Vendí mercadería', 'point_of_sale', m.kardex),
      op('VENTA_SERVICIO', 'Presté un servicio', 'support_agent', m.servicios),
      op('VENTA_ACTIVO', 'Vendí un activo', 'sell', m.activos),
      op('COBRANZA', 'Me pagaron (cobranza)', 'payments'),
      op('PAGO_PROVEEDOR', 'Pagué a un proveedor', 'account_balance_wallet'),
      op('PLANILLA', 'Planilla del mes', 'groups', m.planilla),
      op('APORTE_CAPITAL', 'Un socio aportó capital', 'savings'),
      op('DEPRECIACION', 'Depreciación del mes', 'trending_down', m.activos),
      op('LIQUIDACION_IGV', 'Liquidación de IGV', 'calculate'),
      op('ESPECIAL', 'Otras operaciones (préstamos, anticipos, devoluciones…)', 'swap_horiz'),
      op('MANUAL', 'Otro (asiento manual)', 'edit_note'),
    ].filter((x) => x.activa);
  }

  @Post('previsualizar') @Roles('CONTADOR', 'AUXILIAR')
  previsualizar(@Body() dto: OperacionDto, @Usuario() u: UsuarioJwt) {
    this.permitir(dto, u);
    return this.svc.previsualizar(dto);
  }

  @Post() @Roles('CONTADOR', 'AUXILIAR')
  registrar(@Body() dto: OperacionDto, @Usuario() u: UsuarioJwt) {
    this.permitir(dto, u);
    return this.svc.registrar(dto, u);
  }

  private permitir(dto: OperacionDto, u: UsuarioJwt) {
    if (u.rol === 'AUXILIAR' && SOLO_CONTADOR.includes(dto.tipo)) {
      throw new ForbiddenException('El auxiliar solo registra documentos y pagos');
    }
  }
}

@Module({ imports: [AsientosModule, EmpresaModule], controllers: [OperacionesController], providers: [OperacionesService] })
export class OperacionesModule {}
