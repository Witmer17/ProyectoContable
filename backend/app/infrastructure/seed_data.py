import os
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from app.api.security import hash_password
from app.infrastructure.models import (
    TipoModel,
    NivelModel,
    MonedaModel,
    CuentaModel,
    BloqueoPeriodoModel,
    UsuarioSistemaModel,
    PlantillaAsientoModel,
    PlantillaLineaModel,
)

def ejecutar_seed(db: Session):
    # 1. Tipos de Cuentas
    tipos = [
        (1, "Activo", "Bienes y derechos propiedad de la empresa"),
        (2, "Pasivo", "Obligaciones presentes y deudas"),
        (3, "Patrimonio Neto", "Capital, reservas y resultados acumulados"),
        (4, "Ingresos", "Rentas, ventas y ganancias operativas"),
        (5, "Gastos", "Costos, compras y gastos operativos"),
    ]
    for codigo, nombre, desc in tipos:
        if not db.query(TipoModel).filter(TipoModel.codigo_tipo == codigo).first():
            db.add(TipoModel(codigo_tipo=codigo, nombre=nombre, descripcion=desc))

    # 2. Niveles Jerárquicos PCGE
    niveles = [
        (1, "Elemento", "Primer nivel jerárquico (1 dígito)"),
        (2, "Cuenta Principal", "Rubro contable principal (2 dígitos)"),
        (3, "Subcuenta", "Agrupación analítica (3 dígitos)"),
        (4, "Divisionaria", "Desglose específico (4 dígitos)"),
        (5, "Subdivisionaria", "Mayor detalle transaccional (5 dígitos)"),
    ]
    for codigo, nombre, desc in niveles:
        if not db.query(NivelModel).filter(NivelModel.codigo_nivel == codigo).first():
            db.add(NivelModel(codigo_nivel=codigo, nombre=nombre, descripcion=desc))

    # 3. Monedas
    monedas = [
        (1, "PEN", "Sol Peruano (Moneda Funcional)", Decimal("1.0000"), Decimal("1.0000")),
        (2, "USD", "Dólar Estadounidense", Decimal("3.7500"), Decimal("3.7800")),
        (3, "EUR", "Euro", Decimal("4.1000"), Decimal("4.1500")),
    ]
    for codigo, codigo_iso, desc, tc_compra, tc_venta in monedas:
        if not db.query(MonedaModel).filter(MonedaModel.codigo_moneda == codigo).first():
            db.add(MonedaModel(
                codigo_moneda=codigo,
                tipo_moneda=codigo_iso,
                descripcion=desc,
                tipo_cambio_compra=tc_compra,
                tipo_cambio_venta=tc_venta,
                fecha_actualizacion=date.today(),
            ))

    db.commit()

    # 4. Catálogo de Cuentas PCGE oficial (Perú 2019/2026)
    cuentas_data = [
        # Activo (Tipo 1)
        (101, 1, 3, "Caja", "Efectivo en caja chica y custodia"),
        (1041, 1, 4, "Cuentas corrientes operativas", "Bancos y entidades financieras"),
        (121, 1, 3, "Facturas, boletas y otros comprobantes por cobrar", "Créditos comerciales"),
        (1212, 1, 4, "Emitidas en Cartera", "Cuentas por cobrar emitidas pendientes"),
        (1213, 1, 4, "En cobranza", "Cuentas por cobrar en gestión"),
        (141, 1, 3, "Personal por cobrar", "Anticipos y préstamos al personal"),
        (161, 1, 3, "Préstamos a terceros", "Cuentas por cobrar diversas"),
        (2011, 1, 4, "Mercaderías manufacturadas", "Inventarios para la venta"),
        (3311, 1, 4, "Terrenos", "Propiedad, planta y equipo"),
        (3351, 1, 4, "Muebles y enseres", "Mobiliario administrativo y operativo"),
        # Pasivo (Tipo 2)
        (40111, 2, 5, "IGV - Cuenta Propia", "Impuesto General a las Ventas débito/crédito"),
        (40171, 2, 5, "Renta de Tercera Categoría", "Impuesto a la renta anual e імposiciones"),
        (4111, 2, 4, "Sueldos y salarios por pagar", "Remuneraciones pendientes"),
        (4212, 2, 4, "Facturas por pagar emitidas", "Cuentas por pagar a proveedores"),
        # Patrimonio (Tipo 3)
        (5011, 3, 4, "Capital social", "Aportes de accionistas"),
        (5911, 3, 4, "Utilidades acumuladas", "Resultados no distribuidos"),
        # Gastos (Tipo 5)
        (6011, 5, 4, "Mercaderías - Compras", "Adquisición de inventarios"),
        (6211, 5, 4, "Sueldos y salarios", "Gastos de personal"),
        (6311, 5, 4, "Transporte y flete", "Servicios prestados por terceros"),
        (6511, 5, 4, "Seguros", "Otros gastos de gestión"),
        # Ingresos (Tipo 4)
        (70111, 4, 5, "Mercaderías - Exportación", "Ventas de mercadería al exterior"),
        (70121, 4, 5, "Mercaderías - Venta Local", "Ingresos por ventas gravadas en territorio nacional"),
    ]

    for codigo, cod_tipo, cod_nivel, nombre, desc in cuentas_data:
        if not db.query(CuentaModel).filter(CuentaModel.codigo == codigo).first():
            db.add(CuentaModel(
                codigo=codigo,
                codigo_tipo=cod_tipo,
                codigo_nivel=cod_nivel,
                nombre=nombre,
                descripcion=desc,
                es_auxiliar=True if cod_nivel >= 4 else False,
                estado="ACTIVO",
                saldo_mayor=Decimal("0.00"),
            ))

    # 5. Periodos del ejercicio actual 2026
    for mes in range(1, 13):
        if not db.query(BloqueoPeriodoModel).filter(
            BloqueoPeriodoModel.codigo_ejercicio == 2026,
            BloqueoPeriodoModel.mes == mes
        ).first():
            db.add(BloqueoPeriodoModel(
                codigo_ejercicio=2026,
                mes=mes,
                estado_bloqueo="ABIERTO",
                razon_bloqueo="Período habilitado para operaciones",
            ))

    # 6. Usuarios del sistema
    usuarios = [
        ("admin_juan", "juan.admin@empresa.com", "ADMIN"),
        ("contador_juana", "juana.contadora@empresa.com", "CONTADOR"),
        ("auditor_carlos", "carlos.auditor@empresa.com", "AUDITOR"),
        ("gerente_ana", "ana.gerencia@empresa.com", "GERENTE"),
    ]
    # Contraseña inicial de los usuarios sembrados (solo si SEED_USER_PASSWORD está definida).
    seed_password = os.getenv("SEED_USER_PASSWORD")
    password_hash = hash_password(seed_password) if seed_password else None
    for user, email, rol in usuarios:
        existente = db.query(UsuarioSistemaModel).filter(UsuarioSistemaModel.nombre_usuario == user).first()
        if existente:
            if password_hash and not existente.password_hash:
                existente.password_hash = password_hash
        else:
            db.add(UsuarioSistemaModel(
                password_hash=password_hash,
                nombre_usuario=user,
                correo_electronico=email,
                rol=rol,
                estado="ACTIVO",
                fecha_creacion=datetime.utcnow(),
            ))

    db.commit()

    # 7. Plantillas de asiento base (editables vía API)
    plantillas = [
        ("VENTA_GRAVADA", "Venta gravada con IGV", "Factura {numero} - {cliente}",
         [(1212, "DEBE", "total"), (40111, "HABER", "igv"), (70121, "HABER", "base")]),
        ("COMPRA_GRAVADA", "Compra de mercadería gravada con IGV", "Compra {numero} - {proveedor}",
         [(6011, "DEBE", "base"), (40111, "DEBE", "igv"), (4212, "HABER", "total")]),
        ("SEGURO_MENSUAL", "Devengo mensual de seguros", "Seguro {descripcion}",
         [(6511, "DEBE", "monto"), (4212, "HABER", "monto")]),
    ]
    for codigo, nombre, concepto, lineas in plantillas:
        if not db.query(PlantillaAsientoModel).filter(PlantillaAsientoModel.codigo == codigo).first():
            db.add(PlantillaAsientoModel(
                codigo=codigo, nombre=nombre, concepto_formato=concepto, tipo_asiento="OPERATIVO", activo=True,
                lineas=[PlantillaLineaModel(orden=i, codigo_cuenta=c, lado=lado, variable=var)
                        for i, (c, lado, var) in enumerate(lineas, start=1)],
            ))
    db.commit()
