import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { EmpresaModule } from './empresa/empresa.module';
import { CuentasModule } from './cuentas/cuentas.module';
import { TercerosModule } from './terceros/terceros.module';
import { ProductosModule } from './productos/productos.module';
import { ActivosModule } from './activos/activos.module';
import { AsientosModule } from './asientos/asientos.module';
import { OperacionesModule } from './operaciones/operaciones.module';
import { PeriodosModule } from './periodos/periodos.module';
import { ReportesModule } from './reportes/reportes.module';
import { AdminModule } from './admin/admin.module';
import { JwtAuthGuard, RolesGuard } from './common/roles';

@Module({
  imports: [PrismaModule, AuthModule, EmpresaModule, CuentasModule, TercerosModule, ProductosModule, ActivosModule, AsientosModule, OperacionesModule, PeriodosModule, ReportesModule, AdminModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
