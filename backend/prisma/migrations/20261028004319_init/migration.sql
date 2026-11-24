-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'CONTADOR', 'AUXILIAR', 'LECTURA');

-- CreateEnum
CREATE TYPE "Actividad" AS ENUM ('COMERCIAL', 'SERVICIOS', 'INDUSTRIAL', 'MIXTA');

-- CreateEnum
CREATE TYPE "TipoTercero" AS ENUM ('CLIENTE', 'PROVEEDOR', 'SOCIO', 'TRABAJADOR');

-- CreateEnum
CREATE TYPE "SentidoDocumento" AS ENUM ('COMPRA', 'VENTA');

-- CreateEnum
CREATE TYPE "Condicion" AS ENUM ('CONTADO_EFECTIVO', 'CONTADO_BANCO', 'CREDITO');

-- CreateEnum
CREATE TYPE "EstadoAsiento" AS ENUM ('ACTIVO', 'ANULADO');

-- CreateEnum
CREATE TYPE "EtapaLinea" AS ENUM ('PROVISION', 'DESTINO', 'CANCELACION', 'COSTO', 'BAJA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoMovKardex" AS ENUM ('ENTRADA', 'SALIDA');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "actividad" "Actividad" NOT NULL DEFAULT 'COMERCIAL',
    "tienePlanilla" BOOLEAN NOT NULL DEFAULT false,
    "tieneActivos" BOOLEAN NOT NULL DEFAULT false,
    "usaDolares" BOOLEAN NOT NULL DEFAULT false,
    "recibeHonorarios" BOOLEAN NOT NULL DEFAULT false,
    "igvTasa" DECIMAL(5,4) NOT NULL DEFAULT 0.18,
    "retencionTasa" DECIMAL(5,4) NOT NULL DEFAULT 0.08,
    "metodoKardex" TEXT NOT NULL DEFAULT 'PROMEDIO',
    "configurada" BOOLEAN NOT NULL DEFAULT false,
    "perfil" TEXT NOT NULL DEFAULT 'PERSONALIZADO',

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuenta" (
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "elemento" INTEGER NOT NULL,
    "naturaleza" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "ultimoNivel" BOOLEAN NOT NULL DEFAULT true,
    "requiereDestino" BOOLEAN NOT NULL DEFAULT false,
    "destinoDefecto" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "perfiles" TEXT[],
    "modulo" TEXT,
    "uso" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Cuenta_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "Tercero" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoTercero" NOT NULL,
    "tipoDoc" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "sueldo" DECIMAL(14,2),
    "pension" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Tercero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'UND',
    "stock" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "costoPromedio" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tipo" TEXT NOT NULL DEFAULT 'MERCADERIA',

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KardexMov" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" "TipoMovKardex" NOT NULL,
    "cantidad" DECIMAL(14,4) NOT NULL,
    "costoUnit" DECIMAL(14,6) NOT NULL,
    "costoTotal" DECIMAL(14,2) NOT NULL,
    "saldoCant" DECIMAL(14,4) NOT NULL,
    "saldoCosto" DECIMAL(14,2) NOT NULL,
    "asientoId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KardexMov_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivoFijo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "cuenta" TEXT NOT NULL,
    "fechaCompra" DATE NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "vidaUtilMeses" INTEGER NOT NULL,
    "tasaAnual" DECIMAL(6,4) NOT NULL,
    "depreciado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "documentoId" INTEGER,

    CONSTRAINT "ActivoFijo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "sentido" "SentidoDocumento" NOT NULL,
    "tipo" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "terceroId" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "vencimiento" DATE,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "tipoCambio" DECIMAL(8,4) NOT NULL DEFAULT 1,
    "base" DECIMAL(14,2) NOT NULL,
    "igv" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "saldo" DECIMAL(14,2) NOT NULL,
    "condicion" "Condicion" NOT NULL,
    "operacion" TEXT NOT NULL,
    "glosa" TEXT NOT NULL,
    "asientoId" INTEGER,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "documentoId" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "medio" TEXT NOT NULL,
    "cuentaBancaria" TEXT,
    "asientoId" INTEGER,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asiento" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "periodo" TEXT NOT NULL,
    "operacion" TEXT NOT NULL,
    "glosa" TEXT NOT NULL,
    "estado" "EstadoAsiento" NOT NULL DEFAULT 'ACTIVO',
    "motivoAnulacion" TEXT,
    "reversionId" INTEGER,
    "revierteA" INTEGER,
    "usuarioId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsientoLinea" (
    "id" SERIAL NOT NULL,
    "asientoId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "cuentaCodigo" TEXT NOT NULL,
    "debe" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "haber" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "etapa" "EtapaLinea" NOT NULL DEFAULT 'OTRO',
    "terceroId" INTEGER,
    "glosa" TEXT,

    CONSTRAINT "AsientoLinea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periodo" (
    "id" SERIAL NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "cerrado" BOOLEAN NOT NULL DEFAULT false,
    "motivo" TEXT,
    "cerradoEn" TIMESTAMP(3),

    CONSTRAINT "Periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoCambio" (
    "fecha" DATE NOT NULL,
    "valor" DECIMAL(8,4) NOT NULL,

    CONSTRAINT "TipoCambio_pkey" PRIMARY KEY ("fecha")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tercero_tipo_documento_key" ON "Tercero"("tipo", "documento");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigo_key" ON "Producto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_tipo_serie_numero_terceroId_key" ON "Documento"("tipo", "serie", "numero", "terceroId");

-- CreateIndex
CREATE UNIQUE INDEX "Asiento_numero_key" ON "Asiento"("numero");

-- CreateIndex
CREATE INDEX "Asiento_periodo_idx" ON "Asiento"("periodo");

-- CreateIndex
CREATE INDEX "AsientoLinea_cuentaCodigo_idx" ON "AsientoLinea"("cuentaCodigo");

-- CreateIndex
CREATE UNIQUE INDEX "Periodo_anio_mes_key" ON "Periodo"("anio", "mes");

-- AddForeignKey
ALTER TABLE "KardexMov" ADD CONSTRAINT "KardexMov_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_terceroId_fkey" FOREIGN KEY ("terceroId") REFERENCES "Tercero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asiento" ADD CONSTRAINT "Asiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoLinea" ADD CONSTRAINT "AsientoLinea_asientoId_fkey" FOREIGN KEY ("asientoId") REFERENCES "Asiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoLinea" ADD CONSTRAINT "AsientoLinea_cuentaCodigo_fkey" FOREIGN KEY ("cuentaCodigo") REFERENCES "Cuenta"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoLinea" ADD CONSTRAINT "AsientoLinea_terceroId_fkey" FOREIGN KEY ("terceroId") REFERENCES "Tercero"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
