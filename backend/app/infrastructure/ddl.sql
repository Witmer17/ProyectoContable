-- ====================================================================
-- ESQUEMA DDL COMPLETO EN POSTGRESQL (SISTEMA CONTABLE EMPRESARIAL)
-- Conforme a la especificación de Arquitectura, Auditoría y SUNAT
-- ====================================================================

-- 1. Clasificación de Cuentas según Naturaleza
CREATE TABLE IF NOT EXISTS tipo (
    codigo_tipo INT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(500)
);

-- 2. Clasificación por Nivel Jerárquico
CREATE TABLE IF NOT EXISTS nivel (
    codigo_nivel INT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(500)
);

-- 3. Plan de Cuentas (PCGE)
CREATE TABLE IF NOT EXISTS cuenta (
    codigo INT PRIMARY KEY,
    codigo_tipo INT NOT NULL,
    codigo_nivel INT NOT NULL,
    nombre VARCHAR(500) NOT NULL,
    descripcion VARCHAR(1000),
    es_auxiliar BOOLEAN DEFAULT FALSE,
    requiere_analitica BOOLEAN DEFAULT FALSE,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    saldo_mayor NUMERIC(14,2) DEFAULT 0.00,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cuenta_tipo FOREIGN KEY (codigo_tipo)
        REFERENCES tipo (codigo_tipo) ON DELETE RESTRICT,
    CONSTRAINT fk_cuenta_nivel FOREIGN KEY (codigo_nivel)
        REFERENCES nivel (codigo_nivel) ON DELETE RESTRICT,
    CONSTRAINT chk_estado_cuenta CHECK (estado IN ('ACTIVO', 'INACTIVO', 'BLOQUEADO'))
);

CREATE INDEX IF NOT EXISTS idx_cuenta_tipo ON cuenta (codigo_tipo);
CREATE INDEX IF NOT EXISTS idx_cuenta_nivel ON cuenta (codigo_nivel);
CREATE INDEX IF NOT EXISTS idx_cuenta_estado ON cuenta (estado);

-- 4. Gestión de Monedas y Tipos de Cambio
CREATE TABLE IF NOT EXISTS moneda (
    codigo_moneda INT PRIMARY KEY,
    tipo_moneda VARCHAR(10) NOT NULL UNIQUE, -- 'PEN', 'USD', 'EUR'
    descripcion VARCHAR(100),
    tipo_cambio_compra NUMERIC(9,4) NOT NULL DEFAULT 1.0000,
    tipo_cambio_venta NUMERIC(9,4) NOT NULL DEFAULT 1.0000,
    fecha_actualizacion DATE NOT NULL,
    CONSTRAINT chk_cambio CHECK (tipo_cambio_compra > 0 AND tipo_cambio_venta > 0)
);

-- 5. Cabecera del Asiento (Libro Diario)
CREATE TABLE IF NOT EXISTS partida_encabezado (
    partida INT PRIMARY KEY,
    codigo_ejercicio INT NOT NULL,
    fecha DATE NOT NULL,
    concepto VARCHAR(500) NOT NULL,
    tipo_asiento VARCHAR(50) NOT NULL, -- 'APERTURA', 'OPERATIVO', 'AJUSTE', 'REGULARIZACION', 'CIERRE'
    codigo_moneda INT NOT NULL,
    tipo_cambio NUMERIC(9,4) NOT NULL DEFAULT 1.0000,
    monto_moneda_origen NUMERIC(12,2) NOT NULL,
    debe_total NUMERIC(12,2) NOT NULL,
    haber_total NUMERIC(12,2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'REGISTRADO',
    observaciones VARCHAR(500),
    version INT DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_creacion VARCHAR(100) NOT NULL,
    fecha_modificacion TIMESTAMP,
    usuario_modificacion VARCHAR(100),
    CONSTRAINT fk_encabezado_moneda FOREIGN KEY (codigo_moneda)
        REFERENCES moneda (codigo_moneda),
    CONSTRAINT chk_partida_numero CHECK (partida >= 100),
    CONSTRAINT chk_debe_haber_positivos CHECK (debe_total >= 0 AND haber_total >= 0),
    CONSTRAINT chk_partida_balanceada CHECK (ABS(debe_total - haber_total) < 0.01),
    CONSTRAINT chk_estado_asiento CHECK (estado IN ('REGISTRADO', 'VALIDADO', 'ANULADO', 'RECTIFICADO')),
    CONSTRAINT chk_tipo_asiento CHECK (tipo_asiento IN ('APERTURA', 'OPERATIVO', 'AJUSTE', 'REGULARIZACION', 'CIERRE'))
);

CREATE INDEX IF NOT EXISTS idx_partida_fecha ON partida_encabezado (fecha);
CREATE INDEX IF NOT EXISTS idx_partida_ejercicio ON partida_encabezado (codigo_ejercicio);
CREATE INDEX IF NOT EXISTS idx_partida_estado ON partida_encabezado (estado);
CREATE INDEX IF NOT EXISTS idx_partida_tipo ON partida_encabezado (tipo_asiento);
CREATE INDEX IF NOT EXISTS idx_partida_fecha_estado ON partida_encabezado (fecha, estado);

-- 6. Detalle del Asiento (Movimientos del Mayor)
CREATE TABLE IF NOT EXISTS partida_detalle (
    codigo_detalle SERIAL PRIMARY KEY,
    codigo_partida INT NOT NULL,
    linea_numero INT NOT NULL,
    codigo_cuenta INT NOT NULL,
    codigo_cuenta_analitica INT,
    debe NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    haber NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    saldo_deudor NUMERIC(12,2) DEFAULT 0.00,
    saldo_acreedor NUMERIC(12,2) DEFAULT 0.00,
    observaciones VARCHAR(500),
    CONSTRAINT fk_detalle_partida FOREIGN KEY (codigo_partida)
        REFERENCES partida_encabezado (partida) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_cuenta FOREIGN KEY (codigo_cuenta)
        REFERENCES cuenta (codigo) ON DELETE RESTRICT,
    CONSTRAINT chk_debe_haber CHECK ((debe >= 0 AND haber = 0) OR (debe = 0 AND haber >= 0)),
    CONSTRAINT chk_linea_unica UNIQUE (codigo_partida, linea_numero)
);

CREATE INDEX IF NOT EXISTS idx_detalle_partida ON partida_detalle (codigo_partida);
CREATE INDEX IF NOT EXISTS idx_detalle_cuenta ON partida_detalle (codigo_cuenta);

-- 7. Auditoría Completa de Asientos
CREATE TABLE IF NOT EXISTS auditoria_asiento (
    id_auditoria SERIAL PRIMARY KEY,
    codigo_partida INT NOT NULL,
    tipo_operacion VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    campo_modificado VARCHAR(100),
    valor_anterior VARCHAR(1000),
    valor_nuevo VARCHAR(1000),
    usuario_responsable VARCHAR(100) NOT NULL,
    fecha_operacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_origen VARCHAR(45),
    razon_cambio VARCHAR(500),
    CONSTRAINT fk_auditoria_partida FOREIGN KEY (codigo_partida)
        REFERENCES partida_encabezado (partida) ON DELETE CASCADE,
    CONSTRAINT chk_tipo_op CHECK (tipo_operacion IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX IF NOT EXISTS idx_auditoria_partida ON auditoria_asiento (codigo_partida);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_asiento (fecha_operacion);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_asiento (usuario_responsable);

-- 8. Control de Bloqueo de Períodos
CREATE TABLE IF NOT EXISTS bloqueo_periodo (
    codigo_bloqueo SERIAL PRIMARY KEY,
    codigo_ejercicio INT NOT NULL,
    mes INT NOT NULL,
    estado_bloqueo VARCHAR(20) DEFAULT 'ABIERTO', -- 'ABIERTO', 'PROVISIONAL', 'DEFINITIVO'
    fecha_bloqueo TIMESTAMP,
    usuario_bloqueo VARCHAR(100),
    razon_bloqueo VARCHAR(500),
    CONSTRAINT chk_mes_valido CHECK (mes >= 1 AND mes <= 12),
    CONSTRAINT chk_estado_bloqueo CHECK (estado_bloqueo IN ('ABIERTO', 'PROVISIONAL', 'DEFINITIVO')),
    CONSTRAINT unique_periodo UNIQUE (codigo_ejercicio, mes)
);

-- 9. Gestión de Usuarios del Sistema
CREATE TABLE IF NOT EXISTS usuario_sistema (
    id_usuario SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(100) NOT NULL UNIQUE,
    correo_electronico VARCHAR(255) NOT NULL UNIQUE,
    rol VARCHAR(50) NOT NULL, -- 'ADMIN', 'CONTADOR', 'AUDITOR', 'JEFE_CONTABILIDAD', 'GERENTE'
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_ultimo_acceso TIMESTAMP,
    CONSTRAINT chk_rol_valido CHECK (rol IN ('ADMIN', 'CONTADOR', 'AUDITOR', 'JEFE_CONTABILIDAD', 'GERENTE')),
    CONSTRAINT chk_estado_usuario CHECK (estado IN ('ACTIVO', 'INACTIVO', 'BLOQUEADO'))
);

-- 10. Eventos de Conciliación y Validación
CREATE TABLE IF NOT EXISTS evento_conciliacion (
    id_evento SERIAL PRIMARY KEY,
    fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo_evento VARCHAR(50) NOT NULL, -- 'CIERRE_MENSUAL', 'RECTIFICACION', 'TRANSFERENCIA', 'VALIDACION'
    codigo_partida INT,
    descripcion_evento VARCHAR(500),
    resultado VARCHAR(20), -- 'EXITOSO', 'FALLIDO', 'PARCIAL'
    detalles_error VARCHAR(1000),
    usuario_responsable VARCHAR(100),
    CONSTRAINT fk_evento_partida FOREIGN KEY (codigo_partida)
        REFERENCES partida_encabezado (partida) ON DELETE SET NULL,
    CONSTRAINT chk_resultado CHECK (resultado IN ('EXITOSO', 'FALLIDO', 'PARCIAL'))
);

CREATE INDEX IF NOT EXISTS idx_evento_tipo ON evento_conciliacion (tipo_evento);
CREATE INDEX IF NOT EXISTS idx_evento_fecha ON evento_conciliacion (fecha_evento);
