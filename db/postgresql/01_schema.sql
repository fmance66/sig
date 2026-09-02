-- =============================================================================
-- SCHEMA PostgreSQL 16 — Sistema de Sueldos
-- Migrado desde MySQL 5.5
-- Cubre: módulo sld_ completo + tablas bas_ y sys_ referenciadas
-- =============================================================================
-- Convenciones:
--   - ENUMs MySQL → VARCHAR + CHECK constraint
--   - tinyint(1) / bit(1) → BOOLEAN
--   - datetime → TIMESTAMP
--   - blob/mediumblob/longblob → BYTEA
--   - int(n) → INTEGER
--   - decimal(p,s) → NUMERIC(p,s)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. EXTENSIONES
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- -----------------------------------------------------------------------------
-- 1. TABLAS SYS_ (referenciadas por sld_)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sys_empresa (
    id              SERIAL       PRIMARY KEY,
    sistema         VARCHAR(20),
    version         VARCHAR(10),
    razon_social    VARCHAR(100),
    nombre_comercial VARCHAR(100),
    cuit            VARCHAR(15),
    numero_ib       VARCHAR(15),
    condicion_iva   VARCHAR(25),
    actividad       VARCHAR(100),
    inicio          DATE,
    baja            BYTEA,
    direccion       VARCHAR(100),
    localidad       VARCHAR(50),
    provincia       VARCHAR(25),
    cpa             VARCHAR(10),
    zona            VARCHAR(10),
    telefono        VARCHAR(100),
    email           VARCHAR(100),
    webpage         VARCHAR(50),
    logo            BYTEA,
    observaciones   TEXT,
    mail_address    VARCHAR(100),
    mail_account    VARCHAR(100),
    mail_username   VARCHAR(100),
    mail_password   VARCHAR(100),
    smtp_host       VARCHAR(100),
    smtp_port       INTEGER,
    empresa         INTEGER REFERENCES sys_empresa(id) ON DELETE SET NULL ON UPDATE CASCADE,
    login           BOOLEAN,
    cloud           BOOLEAN,
    workspace       VARCHAR(30),
    cloudspace      VARCHAR(30),
    expired_date    BOOLEAN,
    backup_date     TIMESTAMP,
    cloud_date      TIMESTAMP,
    orden           INTEGER
);

CREATE TABLE IF NOT EXISTS sys_group (
    gid         VARCHAR(20) PRIMARY KEY,
    description VARCHAR(50),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sys_user (
    uid         VARCHAR(20) PRIMARY KEY,
    name        VARCHAR(50),
    password    VARCHAR(20),
    empresa     INTEGER REFERENCES sys_empresa(id) ON DELETE SET NULL ON UPDATE CASCADE,
    terminal    VARCHAR(30),
    workspace   VARCHAR(30),
    cloudspace  VARCHAR(30),
    nivel       INTEGER,
    error_login INTEGER DEFAULT 0,
    last_login  TIMESTAMP,
    timeout     INTEGER,
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sys_sucursal (
    id              SERIAL PRIMARY KEY,
    empresa         INTEGER NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    sucursal        VARCHAR(100),
    nombre_fantasia VARCHAR(200),
    direccion       VARCHAR(200),
    localidad       VARCHAR(100),
    provincia       VARCHAR(50),
    cpa             VARCHAR(10),
    codigo_zona     VARCHAR(20),
    telefono        VARCHAR(50),
    email           VARCHAR(100),
    login           BOOLEAN DEFAULT FALSE,
    orden           INTEGER
);

CREATE TABLE IF NOT EXISTS sys_user_group (
    uid VARCHAR(20) NOT NULL REFERENCES sys_user(uid) ON DELETE CASCADE ON UPDATE CASCADE,
    gid VARCHAR(20) NOT NULL REFERENCES sys_group(gid) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (uid, gid)
);

CREATE TABLE IF NOT EXISTS sys_dynamic_field (
    class   VARCHAR(100) NOT NULL,
    field   VARCHAR(30)  NOT NULL,
    label   VARCHAR(50),
    data_type VARCHAR(20),
    PRIMARY KEY (class, field)
);

-- -----------------------------------------------------------------------------
-- 2. TABLAS BAS_ (referenciadas por sld_)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bas_moneda (
    id          VARCHAR(5)  PRIMARY KEY,
    nombre      VARCHAR(25),
    simbolo     CHAR(3),
    simbolos    VARCHAR(20),
    cotizacion  NUMERIC(10,4),
    color       VARCHAR(11),
    icono       VARCHAR(11),
    orden       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bas_provincia (
    provincia   VARCHAR(20) PRIMARY KEY,
    codigo      VARCHAR(3)
);

CREATE TABLE IF NOT EXISTS bas_pais (
    pais        VARCHAR(20) PRIMARY KEY,
    codigo      VARCHAR(3)
);

CREATE TABLE IF NOT EXISTS bas_localidad (
    localidad   VARCHAR(40) PRIMARY KEY,
    zona        VARCHAR(30),
    provincia   VARCHAR(20) REFERENCES bas_provincia(provincia) ON DELETE SET NULL ON UPDATE CASCADE,
    cpa         VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS bas_proyecto (
    id              VARCHAR(20) PRIMARY KEY,
    descripcion     VARCHAR(100),
    grupo           VARCHAR(50),
    fecha           DATE,
    fecha_fin       DATE,
    horas           INTEGER,
    valor_hora      NUMERIC(11,2),
    presupuesto     NUMERIC(14,2),
    ejecutado       NUMERIC(14,2),
    avance          NUMERIC(5,2),
    moneda          VARCHAR(5) REFERENCES bas_moneda(id) ON DELETE CASCADE ON UPDATE CASCADE,
    observaciones   TEXT,
    alias           VARCHAR(20),
    color           VARCHAR(11),
    orden           INTEGER,
    visible         BOOLEAN DEFAULT TRUE,
    id_padre        VARCHAR(20) REFERENCES bas_proyecto(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS bas_importacion (
    tipo            VARCHAR(20) NOT NULL,
    id              VARCHAR(20) NOT NULL,
    descripcion     VARCHAR(100),
    date_format     VARCHAR(30),
    decimal_format  VARCHAR(30),
    list_separator  CHAR(1),
    escape_sequence VARCHAR(4),
    new_line        BOOLEAN,
    replace_row     BOOLEAN DEFAULT TRUE,
    orden           INTEGER,
    PRIMARY KEY (tipo, id)
);

-- -----------------------------------------------------------------------------
-- 3. MÓDULO SLD_ — CATÁLOGOS (sin dependencias entre sí)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sld_actividad_laboral (
    id          VARCHAR(10) PRIMARY KEY,
    descripcion VARCHAR(100),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_campo_historial (
    id          VARCHAR(20) PRIMARY KEY,
    descripcion VARCHAR(50),
    data_type   VARCHAR(10) CHECK (data_type IN ('TEXT','INTEGER','DECIMAL','DATE')),
    length      INTEGER,
    decimals    INTEGER,
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_codigo_zona (
    id          VARCHAR(5)  PRIMARY KEY,
    descripcion VARCHAR(100),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_condicion_laboral (
    id          VARCHAR(5)  PRIMARY KEY,
    descripcion VARCHAR(100),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_feriado (
    fecha       DATE        PRIMARY KEY,
    descripcion VARCHAR(40)
);

CREATE TABLE IF NOT EXISTS sld_formula_auxiliar (
    id          VARCHAR(30) PRIMARY KEY,
    descripcion VARCHAR(100),
    formato     VARCHAR(100),
    formula     VARCHAR(2048),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_grupo (
    id          VARCHAR(30) PRIMARY KEY,
    descripcion VARCHAR(50),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_clase (
    id          VARCHAR(30) PRIMARY KEY,
    descripcion VARCHAR(100),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_clase_grupo (
    clase VARCHAR(30) NOT NULL REFERENCES sld_clase(id) ON DELETE CASCADE ON UPDATE CASCADE,
    grupo VARCHAR(30) NOT NULL REFERENCES sld_grupo(id)  ON DELETE CASCADE ON UPDATE CASCADE,
    orden INTEGER,
    PRIMARY KEY (clase, grupo)
);

CREATE TABLE IF NOT EXISTS sld_grupo_de_conceptos (
    id          VARCHAR(20) PRIMARY KEY,
    descripcion VARCHAR(50),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_incapacidad (
    id          VARCHAR(5)  PRIMARY KEY,
    descripcion VARCHAR(100),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_modalidad_contrato (
    id          VARCHAR(5)  PRIMARY KEY,
    descripcion VARCHAR(100),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_motivo_ausentismo (
    id          VARCHAR(20) PRIMARY KEY,
    tipo        VARCHAR(12) CHECK (tipo IN ('VOLUNTARIO','INVOLUNTARIO')) DEFAULT 'VOLUNTARIO',
    descripcion VARCHAR(50),
    simbolo     CHAR(4),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_obra_social (
    id                   VARCHAR(20) PRIMARY KEY,
    descripcion          VARCHAR(100),
    aporte_porcentaje    NUMERIC(5,2) DEFAULT 0.00,
    aporte_importe       NUMERIC(10,2) DEFAULT 0.00,
    retencion_porcentaje NUMERIC(5,2) DEFAULT 0.00,
    retencion_importe    NUMERIC(10,2) DEFAULT 0.00,
    orden                INTEGER
);

CREATE TABLE IF NOT EXISTS sld_sindicato (
    id                   VARCHAR(20) PRIMARY KEY,
    descripcion          VARCHAR(100),
    aporte_porcentaje    NUMERIC(5,2) DEFAULT 0.00,
    aporte_importe       NUMERIC(10,2) DEFAULT 0.00,
    retencion_porcentaje NUMERIC(5,2) DEFAULT 0.00,
    retencion_importe    NUMERIC(10,2) DEFAULT 0.00,
    orden                INTEGER
);

CREATE TABLE IF NOT EXISTS sld_situacion_revista (
    id          VARCHAR(5)  PRIMARY KEY,
    descripcion VARCHAR(100),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_tabla (
    id          VARCHAR(30) PRIMARY KEY,
    descripcion VARCHAR(100),
    column_1    VARCHAR(50),
    data_type_1 VARCHAR(10) CHECK (data_type_1 IN ('TEXT','INTEGER','DECIMAL','DATE')),
    length_1    INTEGER,
    decimals_1  INTEGER,
    column_2    VARCHAR(50),
    data_type_2 VARCHAR(10) CHECK (data_type_2 IN ('TEXT','INTEGER','DECIMAL','DATE')),
    length_2    INTEGER,
    decimals_2  INTEGER,
    column_3    VARCHAR(50),
    data_type_3 VARCHAR(10) CHECK (data_type_3 IN ('TEXT','INTEGER','DECIMAL','DATE')),
    length_3    INTEGER,
    decimals_3  INTEGER,
    column_4    VARCHAR(50),
    data_type_4 VARCHAR(10) CHECK (data_type_4 IN ('TEXT','INTEGER','DECIMAL','DATE')),
    length_4    INTEGER,
    decimals_4  INTEGER,
    column_5    VARCHAR(50),
    data_type_5 VARCHAR(10) CHECK (data_type_5 IN ('TEXT','INTEGER','DECIMAL','DATE')),
    length_5    INTEGER,
    decimals_5  INTEGER,
    column_6    VARCHAR(50),
    data_type_6 VARCHAR(10) CHECK (data_type_6 IN ('TEXT','INTEGER','DECIMAL','DATE')),
    length_6    INTEGER,
    decimals_6  INTEGER,
    column_7    VARCHAR(50),
    data_type_7 VARCHAR(10) CHECK (data_type_7 IN ('TEXT','INTEGER','DECIMAL','DATE')),
    length_7    INTEGER,
    decimals_7  INTEGER,
    column_8    VARCHAR(50),
    data_type_8 VARCHAR(10) CHECK (data_type_8 IN ('TEXT','INTEGER','DECIMAL','DATE')),
    length_8    INTEGER,
    decimals_8  INTEGER,
    column_9    VARCHAR(50),
    data_type_9 VARCHAR(10) CHECK (data_type_9 IN ('TEXT','INTEGER','DECIMAL','DATE')),
    length_9    INTEGER,
    decimals_9  INTEGER,
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_tipo_novedad (
    id          VARCHAR(20) PRIMARY KEY,
    descripcion VARCHAR(50),
    data_type   VARCHAR(10) CHECK (data_type IN ('TEXT','INTEGER','DECIMAL','DATE')),
    length      INTEGER,
    decimals    INTEGER,
    orden       INTEGER
);

-- -----------------------------------------------------------------------------
-- 4. CONCEPTOS DE LIQUIDACIÓN
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sld_concepto (
    id                  VARCHAR(10) PRIMARY KEY,
    id_afip             VARCHAR(10),
    descripcion         VARCHAR(50),
    columna             VARCHAR(20) CHECK (columna IN ('REMUNERATIVO','NO_REMUNERATIVO','DESCUENTO','CONTRIBUCION','AUXILIAR')) DEFAULT 'REMUNERATIVO',
    simbolo_unidad      VARCHAR(5),
    decimales_unidad    INTEGER,
    unidad_visible      BOOLEAN DEFAULT TRUE,
    simbolo_unitario    VARCHAR(5),
    decimales_unitario  VARCHAR(11),
    unitario_visible    BOOLEAN DEFAULT TRUE,
    simbolo_afip        VARCHAR(10),
    campo_unidad        BOOLEAN DEFAULT FALSE,
    leyenda_unidad      VARCHAR(50),
    campo_importe       BOOLEAN DEFAULT FALSE,
    leyenda_importe     VARCHAR(50),
    formula_unidad      VARCHAR(1024),
    formula_importe     VARCHAR(1024),
    formula_unitario    VARCHAR(512),
    formula_condicion   VARCHAR(512),
    activo              BOOLEAN DEFAULT TRUE,
    orden               INTEGER
);

CREATE TABLE IF NOT EXISTS sld_concepto_lsd (
    concepto                VARCHAR(10) PRIMARY KEY REFERENCES sld_concepto(id) ON DELETE CASCADE ON UPDATE CASCADE,
    aporte_sipa             BOOLEAN DEFAULT FALSE,
    aporte_inssjyp          BOOLEAN DEFAULT FALSE,
    aporte_obrasocial       BOOLEAN DEFAULT FALSE,
    aporte_fsr              BOOLEAN DEFAULT FALSE,
    aporte_uatre            BOOLEAN DEFAULT FALSE,
    aporte_diferencial      BOOLEAN DEFAULT FALSE,
    aporte_regespecial      BOOLEAN DEFAULT FALSE,
    aporte_libre1           BOOLEAN DEFAULT FALSE,
    aporte_libre2           BOOLEAN DEFAULT FALSE,
    contribucion_sipa       BOOLEAN DEFAULT FALSE,
    contribucion_inssjyp    BOOLEAN DEFAULT FALSE,
    contribucion_obrasocial BOOLEAN DEFAULT FALSE,
    contribucion_fsr        BOOLEAN DEFAULT FALSE,
    contribucion_renatre    BOOLEAN DEFAULT FALSE,
    contribucion_aaff       BOOLEAN DEFAULT FALSE,
    contribucion_fne        BOOLEAN DEFAULT FALSE,
    contribucion_lrt        BOOLEAN DEFAULT FALSE,
    contribucion_libre1     BOOLEAN DEFAULT FALSE,
    contribucion_libre2     BOOLEAN DEFAULT FALSE,
    repetible               BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sld_concepto_general (
    concepto        VARCHAR(10) NOT NULL REFERENCES sld_concepto(id) ON DELETE CASCADE ON UPDATE CASCADE,
    liquidacion     VARCHAR(15) NOT NULL CHECK (liquidacion IN ('MENSUAL','QUINCENA_1','QUINCENA_2','AGUINALDO','VACACIONES','RENUNCIA','DESPIDO','OTROS')),
    recibo          INTEGER     NOT NULL DEFAULT 0,
    descripcion     VARCHAR(50),
    unidad_manual   NUMERIC(11,4),
    importe_manual  NUMERIC(17,8),
    vigencia_desde  DATE,
    vigencia_hasta  DATE,
    orden           INTEGER,
    UNIQUE (concepto, liquidacion, recibo)
);

CREATE TABLE IF NOT EXISTS sld_concepto_grupo (
    grupo    VARCHAR(30) NOT NULL REFERENCES sld_grupo(id) ON DELETE CASCADE ON UPDATE CASCADE,
    concepto VARCHAR(10) NOT NULL REFERENCES sld_concepto(id) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (grupo, concepto)
);

ALTER TABLE sld_concepto
    ADD COLUMN IF NOT EXISTS clase VARCHAR(30) REFERENCES sld_clase(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 5. CONVENIO Y CATEGORÍAS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sld_convenio (
    id                  VARCHAR(20) PRIMARY KEY,
    descripcion         VARCHAR(100),
    liquidacion         VARCHAR(7) CHECK (liquidacion IN ('MENSUAL','JORNAL')) DEFAULT 'MENSUAL',
    dias                NUMERIC(5,2),
    horas               NUMERIC(5,2),
    moneda              VARCHAR(5) REFERENCES bas_moneda(id) ON DELETE SET NULL ON UPDATE CASCADE,
    obra_social         VARCHAR(20) REFERENCES sld_obra_social(id) ON DELETE SET NULL ON UPDATE CASCADE,
    grupo_de_conceptos  VARCHAR(20) REFERENCES sld_grupo_de_conceptos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    orden               INTEGER
);

CREATE TABLE IF NOT EXISTS sld_categoria (
    convenio    VARCHAR(20) NOT NULL REFERENCES sld_convenio(id) ON DELETE CASCADE ON UPDATE CASCADE,
    id          VARCHAR(20) NOT NULL,
    descripcion VARCHAR(100),
    sueldo      NUMERIC(21,12) DEFAULT 0,
    adicional   NUMERIC(13,4),
    auxiliar    NUMERIC(13,4),
    jornada     VARCHAR(9) CHECK (jornada IN ('COMPLETA','MEDIA','REDUCIDA')),
    liquidacion VARCHAR(7) CHECK (liquidacion IN ('MENSUAL','JORNAL')),
    orden       INTEGER,
    PRIMARY KEY (convenio, id)
);

CREATE TABLE IF NOT EXISTS sld_categoria_periodo (
    convenio    VARCHAR(20) NOT NULL,
    categoria   VARCHAR(20) NOT NULL,
    fecha       DATE        NOT NULL,
    fecha_hasta DATE,
    sueldo      NUMERIC(21,12) DEFAULT 0,
    adicional   NUMERIC(13,4),
    auxiliar    NUMERIC(13,4),
    PRIMARY KEY (convenio, categoria, fecha),
    FOREIGN KEY (convenio, categoria) REFERENCES sld_categoria(convenio, id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 6. LIQUIDACIÓN (no depende de sld_empleado)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sld_liquidacion (
    periodo             VARCHAR(30) PRIMARY KEY,
    tipo                VARCHAR(15) CHECK (tipo IN ('MENSUAL','QUINCENA_1','QUINCENA_2','AGUINALDO','VACACIONES','RENUNCIA','DESPIDO','OTROS')),
    estado              VARCHAR(8)  CHECK (estado IN ('ABIERTA','CERRADA','ACTIVA')) DEFAULT 'ABIERTA',
    fecha               DATE,
    fecha_desde         DATE,
    fecha_hasta         DATE,
    descripcion         VARCHAR(50),
    concepto_predef     VARCHAR(30) CHECK (concepto_predef IN ('TODO','GRUPAL','INDIVIDUAL','GENERAL','GRUPAL_INDIVIDUAL','GRUPAL_GENERAL','INDIVIDUAL_GENERAL')) DEFAULT 'TODO',
    fecha_pago          DATE,
    lugar_pago          VARCHAR(100),
    fecha_deposito      DATE,
    periodo_deposito    VARCHAR(40),
    banco_deposito      VARCHAR(60),
    orden               INTEGER
);

-- -----------------------------------------------------------------------------
-- 7. EMPLEADO — tabla central
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sld_empleado (
    id                  SERIAL PRIMARY KEY,
    legajo              VARCHAR(20) NOT NULL,
    apellido            VARCHAR(25),
    nombre              VARCHAR(25),
    cuil                VARCHAR(15),
    grupo               VARCHAR(20),
    estado              VARCHAR(20),
    tarea               VARCHAR(50),
    fecha_ingreso       DATE,
    fecha_egreso        DATE,
    fecha_antiguedad    DATE,
    antiguedad          INTEGER,
    sexo                CHAR(1)     CHECK (sexo IN ('M','F','X')),
    fecha_nacimiento    DATE,
    nacionalidad        VARCHAR(25),
    estado_civil        VARCHAR(12) CHECK (estado_civil IN ('SOLTERO','CASADO','CONCUBINATO','DIVORCIADO','SEPARADO','VIUDO')) DEFAULT 'SOLTERO',
    tipo_documento      VARCHAR(5),
    numero_documento    VARCHAR(15),
    direccion           VARCHAR(100),
    localidad           VARCHAR(40),
    provincia           VARCHAR(20),
    cpa                 VARCHAR(10),
    telefono            VARCHAR(100),
    email               VARCHAR(100),
    foto                BYTEA,
    orden               INTEGER,
    convenio            VARCHAR(20),
    categoria           VARCHAR(20),
    sueldo              NUMERIC(21,12) DEFAULT 0,
    adicional           NUMERIC(13,4),
    auxiliar            NUMERIC(13,4),
    dias                NUMERIC(5,2),
    horas               NUMERIC(5,2),
    porcentaje          NUMERIC(5,2),
    jornada             VARCHAR(9)  CHECK (jornada IN ('COMPLETA','MEDIA','REDUCIDA')),
    proporcional        BOOLEAN     DEFAULT FALSE,
    liquidacion         VARCHAR(7)  CHECK (liquidacion IN ('MENSUAL','JORNAL')) DEFAULT 'MENSUAL',
    moneda              VARCHAR(5)  REFERENCES bas_moneda(id) ON DELETE SET NULL ON UPDATE CASCADE,
    vacaciones          INTEGER,
    obra_social         VARCHAR(20) REFERENCES sld_obra_social(id) ON DELETE SET NULL ON UPDATE CASCADE,
    sindicato           VARCHAR(20) REFERENCES sld_sindicato(id) ON DELETE SET NULL ON UPDATE CASCADE,
    proyecto            VARCHAR(20) REFERENCES bas_proyecto(id) ON DELETE SET NULL ON UPDATE CASCADE,
    empresa             INTEGER REFERENCES sys_empresa(id) ON DELETE SET NULL ON UPDATE CASCADE,
    lugar_trabajo       VARCHAR(50),
    banco               VARCHAR(40),
    cuenta              VARCHAR(40),
    cbu                 VARCHAR(25),
    grupo_de_conceptos  VARCHAR(20) REFERENCES sld_grupo_de_conceptos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    observaciones       TEXT,
    FOREIGN KEY (convenio, categoria) REFERENCES sld_categoria(convenio, id) ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE (empresa, legajo)
);

CREATE INDEX IF NOT EXISTS idx_sld_empleado_orden ON sld_empleado(orden, id);
CREATE INDEX IF NOT EXISTS idx_sld_empleado_empresa ON sld_empleado(empresa);

-- -----------------------------------------------------------------------------
-- 8. SUB-TABLAS DE EMPLEADO
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sld_empleado_afip (
    empleado            INTEGER     PRIMARY KEY REFERENCES sld_empleado(id) ON DELETE CASCADE ON UPDATE CASCADE,
    situacion           VARCHAR(5)  REFERENCES sld_situacion_revista(id) ON DELETE SET NULL ON UPDATE CASCADE,
    condicion           VARCHAR(5)  REFERENCES sld_condicion_laboral(id) ON DELETE SET NULL ON UPDATE CASCADE,
    actividad           VARCHAR(10) REFERENCES sld_actividad_laboral(id) ON DELETE SET NULL ON UPDATE CASCADE,
    modalidad           VARCHAR(5)  REFERENCES sld_modalidad_contrato(id) ON DELETE SET NULL ON UPDATE CASCADE,
    incapacidad         VARCHAR(5)  REFERENCES sld_incapacidad(id) ON DELETE SET NULL ON UPDATE CASCADE,
    codigo_zona         VARCHAR(5)  REFERENCES sld_codigo_zona(id) ON DELETE SET NULL ON UPDATE CASCADE,
    situacion_revista_1 VARCHAR(5)  REFERENCES sld_situacion_revista(id) ON DELETE SET NULL ON UPDATE CASCADE,
    dia_inicio_1        INTEGER,
    situacion_revista_2 VARCHAR(5)  REFERENCES sld_situacion_revista(id) ON DELETE SET NULL ON UPDATE CASCADE,
    dia_inicio_2        INTEGER,
    situacion_revista_3 VARCHAR(5)  REFERENCES sld_situacion_revista(id) ON DELETE SET NULL ON UPDATE CASCADE,
    dia_inicio_3        INTEGER
);

CREATE TABLE IF NOT EXISTS sld_empleado_concepto (
    empleado        INTEGER     NOT NULL REFERENCES sld_empleado(id) ON DELETE CASCADE ON UPDATE CASCADE,
    concepto        VARCHAR(10) NOT NULL REFERENCES sld_concepto(id) ON DELETE CASCADE ON UPDATE CASCADE,
    liquidacion     VARCHAR(15) NOT NULL CHECK (liquidacion IN ('MENSUAL','QUINCENA_1','QUINCENA_2','AGUINALDO','VACACIONES','RENUNCIA','DESPIDO','OTROS')),
    recibo          INTEGER     NOT NULL DEFAULT 0,
    descripcion     VARCHAR(50),
    unidad_manual   NUMERIC(11,4),
    importe_manual  NUMERIC(17,8),
    vigencia_desde  DATE,
    vigencia_hasta  DATE,
    orden           INTEGER,
    UNIQUE (empleado, concepto, liquidacion, recibo)
);

CREATE TABLE IF NOT EXISTS sld_empleado_field (
    class   VARCHAR(100) NOT NULL,
    field   VARCHAR(30)  NOT NULL,
    entity  INTEGER      NOT NULL REFERENCES sld_empleado(id) ON DELETE CASCADE ON UPDATE CASCADE,
    value   VARCHAR(100),
    PRIMARY KEY (class, field, entity),
    FOREIGN KEY (class, field) REFERENCES sys_dynamic_field(class, field) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS sld_familiar (
    empleado        INTEGER     NOT NULL REFERENCES sld_empleado(id) ON DELETE CASCADE ON UPDATE CASCADE,
    id              VARCHAR(20) NOT NULL,
    parentesco      VARCHAR(10) CHECK (parentesco IN ('CONYUGE','HIJO','PRENATAL','FAMILIAR','OTRO')),
    apellido        VARCHAR(25),
    nombre          VARCHAR(25),
    fecha_alta      DATE,
    cuil            VARCHAR(15),
    sexo            CHAR(1)     CHECK (sexo IN ('M','F','X')),
    fecha_nacimiento DATE,
    nacionalidad    VARCHAR(20),
    tipo_documento  VARCHAR(5),
    numero_documento VARCHAR(15),
    estudio         VARCHAR(12) CHECK (estudio IN ('PREESCOLAR','PRIMARIA','SECUNDARIA','TERCIARIA','UNIVERSIDAD')),
    estado_academico VARCHAR(10) CHECK (estado_academico IN ('EN_CURSO','COMPLETO','INCOMPLETO')),
    anio_academico  INTEGER,
    discapacidad    VARCHAR(2)  CHECK (discapacidad IN ('SI','NO')) DEFAULT 'NO',
    adopcion        VARCHAR(2)  CHECK (adopcion IN ('SI','NO')) DEFAULT 'NO',
    adherente       VARCHAR(2)  CHECK (adherente IN ('SI','NO')) DEFAULT 'NO',
    deducible       VARCHAR(2)  CHECK (deducible IN ('SI','NO')) DEFAULT 'SI',
    porcentaje      NUMERIC(5,2),
    PRIMARY KEY (empleado, id)
);

CREATE TABLE IF NOT EXISTS sld_jornada_laboral (
    empleado    INTEGER     PRIMARY KEY REFERENCES sld_empleado(id) ON DELETE CASCADE ON UPDATE CASCADE,
    horario     VARCHAR(8)  CHECK (horario IN ('FIJO','ROTATIVO')) DEFAULT 'FIJO',
    feriados    VARCHAR(2)  CHECK (feriados IN ('SI','NO')) DEFAULT 'NO'
);

CREATE TABLE IF NOT EXISTS sld_horario (
    empleado    INTEGER     NOT NULL REFERENCES sld_jornada_laboral(empleado) ON DELETE CASCADE ON UPDATE CASCADE,
    dia         VARCHAR(9)  NOT NULL CHECK (dia IN ('LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO','DOMINGO')),
    entrada     TIME,
    salida      TIME,
    PRIMARY KEY (empleado, dia)
);

CREATE TABLE IF NOT EXISTS sld_ausentismo (
    empleado    INTEGER     NOT NULL REFERENCES sld_empleado(id) ON DELETE CASCADE ON UPDATE CASCADE,
    motivo      VARCHAR(20) NOT NULL REFERENCES sld_motivo_ausentismo(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha_desde DATE        NOT NULL,
    fecha_hasta DATE,
    observaciones TEXT,
    PRIMARY KEY (empleado, motivo, fecha_desde)
);

CREATE TABLE IF NOT EXISTS sld_presentismo (
    empleado    INTEGER     NOT NULL REFERENCES sld_empleado(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha       DATE        NOT NULL,
    hora        TIME        NOT NULL,
    tipo        VARCHAR(7)  CHECK (tipo IN ('ENTRADA','SALIDA')),
    PRIMARY KEY (empleado, fecha, hora)
);

CREATE TABLE IF NOT EXISTS sld_novedad (
    empleado        INTEGER     NOT NULL REFERENCES sld_empleado(id) ON DELETE CASCADE ON UPDATE CASCADE,
    tipo_novedad    VARCHAR(20) NOT NULL REFERENCES sld_tipo_novedad(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha           DATE        NOT NULL,
    value           VARCHAR(1024),
    PRIMARY KEY (empleado, tipo_novedad, fecha)
);

CREATE TABLE IF NOT EXISTS sld_historial_empleado (
    empleado    INTEGER     NOT NULL REFERENCES sld_empleado(id) ON DELETE CASCADE ON UPDATE CASCADE,
    campo       VARCHAR(20) NOT NULL REFERENCES sld_campo_historial(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha_desde DATE        NOT NULL,
    fecha_hasta DATE,
    valor       VARCHAR(100),
    PRIMARY KEY (empleado, campo, fecha_desde)
);

-- -----------------------------------------------------------------------------
-- 9. CONCEPTOS A NIVEL GRUPO DE CONCEPTOS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sld_concepto_de_grupo (
    grupo_de_conceptos  VARCHAR(20) NOT NULL REFERENCES sld_grupo_de_conceptos(id) ON DELETE CASCADE ON UPDATE CASCADE,
    concepto            VARCHAR(10) NOT NULL REFERENCES sld_concepto(id) ON DELETE CASCADE ON UPDATE CASCADE,
    liquidacion         VARCHAR(15) NOT NULL CHECK (liquidacion IN ('MENSUAL','QUINCENA_1','QUINCENA_2','AGUINALDO','VACACIONES','RENUNCIA','DESPIDO','OTROS')),
    recibo              INTEGER     NOT NULL DEFAULT 0,
    descripcion         VARCHAR(50),
    unidad_manual       NUMERIC(11,4),
    importe_manual      NUMERIC(17,8),
    vigencia_desde      DATE,
    vigencia_hasta      DATE,
    orden               INTEGER,
    UNIQUE (grupo_de_conceptos, concepto, liquidacion, recibo)
);

-- -----------------------------------------------------------------------------
-- 10. RECIBOS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sld_recibo (
    periodo         VARCHAR(30) NOT NULL REFERENCES sld_liquidacion(periodo) ON DELETE CASCADE ON UPDATE CASCADE,
    empleado        INTEGER     NOT NULL REFERENCES sld_empleado(id) ON DELETE CASCADE ON UPDATE CASCADE,
    numero          INTEGER     NOT NULL DEFAULT 1,
    periodo_recibo  VARCHAR(30),
    fecha_recibo    DATE,
    fecha_pago      DATE,
    remunerativo    NUMERIC(14,2),
    no_remunerativo NUMERIC(14,2),
    descuento       NUMERIC(14,2),
    sueldo_neto     NUMERIC(14,2),
    sueldo_bruto    NUMERIC(14,2),
    contribucion    NUMERIC(14,2),
    costo_laboral   NUMERIC(14,2),
    moneda          VARCHAR(5)  REFERENCES bas_moneda(id) ON DELETE SET NULL ON UPDATE CASCADE,
    cotizacion      NUMERIC(9,3) DEFAULT 1.000,
    proyecto        VARCHAR(20) REFERENCES bas_proyecto(id) ON DELETE SET NULL ON UPDATE CASCADE,
    observaciones   TEXT,
    mail            BOOLEAN     DEFAULT FALSE,
    visible         BOOLEAN     DEFAULT TRUE,
    orden           INTEGER,
    PRIMARY KEY (periodo, empleado, numero)
);

CREATE TABLE IF NOT EXISTS sld_recibo_concepto (
    periodo         VARCHAR(30) NOT NULL,
    empleado        INTEGER     NOT NULL,
    numero          INTEGER     NOT NULL,
    concepto        VARCHAR(10) NOT NULL REFERENCES sld_concepto(id) ON DELETE CASCADE ON UPDATE CASCADE,
    descripcion     VARCHAR(50),
    unidad_manual   NUMERIC(11,4),
    importe_manual  NUMERIC(17,8),
    unidad          NUMERIC(10,4),
    importe         NUMERIC(12,2),
    unitario        NUMERIC(10,2),
    condicion       BOOLEAN     DEFAULT TRUE,
    warning         BOOLEAN     DEFAULT FALSE,
    error           BOOLEAN     DEFAULT FALSE,
    message         TEXT,
    vigencia_desde  DATE,
    vigencia_hasta  DATE,
    orden           INTEGER,
    PRIMARY KEY (periodo, empleado, numero, concepto),
    FOREIGN KEY (periodo, empleado, numero) REFERENCES sld_recibo(periodo, empleado, numero) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS sld_recibo_empleado (
    empleado                INTEGER     NOT NULL REFERENCES sld_empleado(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha                   DATE        NOT NULL,
    tarea                   VARCHAR(50),
    convenio                VARCHAR(20),
    categoria               VARCHAR(20),
    sueldo_categoria        NUMERIC(21,12) DEFAULT 0,
    adicional_categoria     NUMERIC(11,2),
    auxiliar_categoria      NUMERIC(11,2),
    sueldo                  NUMERIC(21,12) DEFAULT 0,
    adicional               NUMERIC(13,4),
    auxiliar                NUMERIC(13,4),
    dias                    NUMERIC(5,2),
    horas                   NUMERIC(5,2),
    porcentaje              NUMERIC(5,2),
    jornada                 VARCHAR(9)  CHECK (jornada IN ('COMPLETA','MEDIA','REDUCIDA')),
    liquidacion             VARCHAR(7)  CHECK (liquidacion IN ('MENSUAL','JORNAL')) DEFAULT 'MENSUAL',
    obra_social             VARCHAR(20) REFERENCES sld_obra_social(id) ON DELETE SET NULL ON UPDATE CASCADE,
    sindicato               VARCHAR(20) REFERENCES sld_sindicato(id) ON DELETE SET NULL ON UPDATE CASCADE,
    PRIMARY KEY (empleado, fecha),
    FOREIGN KEY (convenio, categoria) REFERENCES sld_categoria(convenio, id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS sld_recibo_afip (
    empleado            INTEGER     NOT NULL REFERENCES sld_empleado(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha               DATE        NOT NULL,
    situacion           VARCHAR(5)  REFERENCES sld_situacion_revista(id) ON DELETE SET NULL ON UPDATE CASCADE,
    condicion           VARCHAR(5)  REFERENCES sld_condicion_laboral(id) ON DELETE SET NULL ON UPDATE CASCADE,
    actividad           VARCHAR(10) REFERENCES sld_actividad_laboral(id) ON DELETE SET NULL ON UPDATE CASCADE,
    modalidad           VARCHAR(5)  REFERENCES sld_modalidad_contrato(id) ON DELETE SET NULL ON UPDATE CASCADE,
    incapacidad         VARCHAR(5)  REFERENCES sld_incapacidad(id) ON DELETE SET NULL ON UPDATE CASCADE,
    codigo_zona         VARCHAR(5)  REFERENCES sld_codigo_zona(id) ON DELETE SET NULL ON UPDATE CASCADE,
    situacion_revista_1 VARCHAR(5)  REFERENCES sld_situacion_revista(id) ON DELETE SET NULL ON UPDATE CASCADE,
    dia_inicio_1        INTEGER,
    situacion_revista_2 VARCHAR(5)  REFERENCES sld_situacion_revista(id) ON DELETE SET NULL ON UPDATE CASCADE,
    dia_inicio_2        INTEGER,
    situacion_revista_3 VARCHAR(5)  REFERENCES sld_situacion_revista(id) ON DELETE SET NULL ON UPDATE CASCADE,
    dia_inicio_3        INTEGER,
    PRIMARY KEY (empleado, fecha)
);

-- sld_recibo_asiento — vincula recibo con asiento contable
-- cnt_asiento no se migra en esta fase, se deja comentado
-- CREATE TABLE IF NOT EXISTS sld_recibo_asiento (
--     periodo     VARCHAR(20) NOT NULL,
--     empleado    VARCHAR(20) NOT NULL,
--     numero      INTEGER     NOT NULL,
--     ejercicio   VARCHAR(10) NOT NULL,
--     asiento     INTEGER     NOT NULL,
--     PRIMARY KEY (periodo, empleado, numero, ejercicio, asiento),
--     FOREIGN KEY (periodo, empleado, numero) REFERENCES sld_recibo(periodo, empleado, numero) ON DELETE CASCADE ON UPDATE CASCADE
-- );

-- -----------------------------------------------------------------------------
-- 11. TABLAS HISTÓRICAS Y PARAMÉTRICAS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sld_historial (
    campo       VARCHAR(20) NOT NULL REFERENCES sld_campo_historial(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha_desde DATE        NOT NULL,
    fecha_hasta DATE,
    valor       VARCHAR(100),
    PRIMARY KEY (campo, fecha_desde)
);

CREATE TABLE IF NOT EXISTS sld_fila (
    tabla   VARCHAR(30) NOT NULL REFERENCES sld_tabla(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fila    INTEGER     NOT NULL,
    value_1 VARCHAR(100),
    value_2 VARCHAR(100),
    value_3 VARCHAR(100),
    value_4 VARCHAR(100),
    value_5 VARCHAR(100),
    value_6 VARCHAR(100),
    value_7 VARCHAR(100),
    value_8 VARCHAR(100),
    value_9 VARCHAR(100),
    PRIMARY KEY (tabla, fila)
);

-- -----------------------------------------------------------------------------
-- 12. IMPORTACIÓN DE NOVEDADES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sld_importacion (
    tipo        VARCHAR(20) NOT NULL,
    importacion VARCHAR(20) NOT NULL,
    valor_cero  BOOLEAN     DEFAULT FALSE,
    PRIMARY KEY (tipo, importacion),
    FOREIGN KEY (tipo, importacion) REFERENCES bas_importacion(tipo, id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS sld_importacion_novedad (
    tipo        VARCHAR(20) NOT NULL,
    importacion VARCHAR(20) NOT NULL,
    numero      INTEGER     NOT NULL,
    tipo_novedad VARCHAR(20) REFERENCES sld_tipo_novedad(id) ON DELETE SET NULL ON UPDATE CASCADE,
    novedad_col CHAR(3),
    valor_col   CHAR(3),
    PRIMARY KEY (tipo, importacion, numero),
    FOREIGN KEY (tipo, importacion) REFERENCES bas_importacion(tipo, id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- 13. INFORMES DEL MÓDULO
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sld_informe (
    id          VARCHAR(20) PRIMARY KEY,
    descripcion VARCHAR(50),
    tabla       VARCHAR(15) CHECK (tabla IN ('RECIBO','RECIBO_CONCEPTO','EMPLEADO','FAMILIAR')),
    agrupacion  VARCHAR(20) CHECK (agrupacion IN ('EMPLEADO','GRUPO','CONVENIO','CATEGORIA','OBRA_SOCIAL','CENTRO_DE_COSTO','MODALIDAD','PERIODO')),
    ordenamiento VARCHAR(12) CHECK (ordenamiento IN ('LEGAJO','APELLIDO','FECHA_ASC','FECHA_DES','CONCEPTO')) DEFAULT 'LEGAJO',
    pesificar   BOOLEAN     DEFAULT FALSE,
    orientation VARCHAR(12) CHECK (orientation IN ('VERTICAL','HORIZONTAL')) DEFAULT 'VERTICAL',
    page_size   VARCHAR(8)  CHECK (page_size IN ('A4','A5','TICKET','LEGAL','LETTER','CUSTOM')) DEFAULT 'A4',
    width       NUMERIC(4,2),
    height      NUMERIC(4,2),
    left_margin NUMERIC(4,2),
    top_margin  NUMERIC(4,2),
    bottom_margin NUMERIC(4,2),
    right_margin NUMERIC(4,2),
    condicion   VARCHAR(256),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sld_informe_campo (
    informe     VARCHAR(20) NOT NULL REFERENCES sld_informe(id) ON DELETE CASCADE ON UPDATE CASCADE,
    campo       INTEGER     NOT NULL,
    tipo        VARCHAR(6)  CHECK (tipo IN ('FILA','TOTAL')) DEFAULT 'FILA',
    agrupado    BOOLEAN     DEFAULT FALSE,
    visible     BOOLEAN     DEFAULT TRUE,
    descripcion VARCHAR(50),
    formula     VARCHAR(512),
    data_type   VARCHAR(10) CHECK (data_type IN ('TEXT','INTEGER','DECIMAL','DATE')),
    length      INTEGER,
    decimals    INTEGER,
    campo_format VARCHAR(30),
    group_function VARCHAR(5) CHECK (group_function IN ('SUM','MAX','MIN','FIRST','LAST')),
    PRIMARY KEY (informe, campo)
);

-- -----------------------------------------------------------------------------
-- 14. DISEÑO DE RECIBOS Y LIBRO DE SUELDOS
-- (antes migrations/002_informes_formularios.sql + 003_formulario_parametro_estilo.sql,
-- plegado acá para que un `docker compose down -v` + `up -d` no quede corto — mismo
-- criterio que sys_sucursal en la sección de sistema. Los archivos de migración quedan
-- solo como referencia histórica, no hace falta ejecutarlos.)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sld_formulario_recibo (
    id                SERIAL PRIMARY KEY,
    empresa           INTEGER NOT NULL REFERENCES sys_empresa(id),
    nombre            VARCHAR(20) NOT NULL,
    descripcion       VARCHAR(50),
    orientacion       VARCHAR(12) CHECK (orientacion IN ('VERTICAL','HORIZONTAL')) DEFAULT 'VERTICAL',
    pagina            VARCHAR(8)  CHECK (pagina IN ('A4','A5','TICKET','LEGAL','LETTER','CUSTOM')) DEFAULT 'A4',
    margen_superior   NUMERIC(5,2),
    margen_inferior   NUMERIC(5,2),
    margen_izquierdo  NUMERIC(5,2),
    margen_derecho    NUMERIC(5,2),
    formulario_hermano INTEGER REFERENCES sld_formulario_recibo(id) ON DELETE SET NULL,
    formula_archivo   VARCHAR(256),
    columnas          INTEGER,
    filas             INTEGER,
    copias            INTEGER,
    propiedad         VARCHAR(30),
    etiquetas         BOOLEAN DEFAULT FALSE,
    orden             INTEGER,
    activo            BOOLEAN NOT NULL DEFAULT FALSE,
    -- TRUE = este diseño no usa el motor de cajas x/y (parámetros): pdfInformes.js lo
    -- interpreta con el layout fijo de reciboLey27802.js (Anexo III, Decreto 407/2026).
    -- Ver sección 13 de MIGRACION_BITACORA.md.
    ley_27802         BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (empresa, nombre)
);

-- A lo sumo un formulario "activo" (el que usa pdfInformes.js para armar el PDF) por
-- empresa — ver backend/src/services/pdfInformes.js.
CREATE UNIQUE INDEX IF NOT EXISTS sld_formulario_recibo_activo_uk
    ON sld_formulario_recibo (empresa) WHERE activo;

CREATE TABLE IF NOT EXISTS sld_formulario_recibo_parametro (
    formulario  INTEGER NOT NULL REFERENCES sld_formulario_recibo(id) ON DELETE CASCADE ON UPDATE CASCADE,
    parametro   VARCHAR(50) NOT NULL,
    descripcion VARCHAR(100),
    texto       VARCHAR(255),
    x           NUMERIC(6,2),
    y           NUMERIC(6,2),
    ancho       NUMERIC(6,2),
    alto        NUMERIC(6,2),
    orden       INTEGER,
    alignment        VARCHAR(12),
    font             VARCHAR(60),
    border_color     VARCHAR(11),
    background_color VARCHAR(11),
    auto_height      BOOLEAN DEFAULT FALSE,
    print            BOOLEAN DEFAULT TRUE,
    condicion        VARCHAR(256),
    PRIMARY KEY (formulario, parametro)
);

CREATE TABLE IF NOT EXISTS sld_formulario_libro (
    id                SERIAL PRIMARY KEY,
    empresa           INTEGER NOT NULL REFERENCES sys_empresa(id),
    nombre            VARCHAR(20) NOT NULL,
    descripcion       VARCHAR(50),
    orientacion       VARCHAR(12) CHECK (orientacion IN ('VERTICAL','HORIZONTAL')) DEFAULT 'HORIZONTAL',
    pagina            VARCHAR(8)  CHECK (pagina IN ('A4','A5','TICKET','LEGAL','LETTER','CUSTOM')) DEFAULT 'A4',
    margen_superior   NUMERIC(5,2),
    margen_inferior   NUMERIC(5,2),
    margen_izquierdo  NUMERIC(5,2),
    margen_derecho    NUMERIC(5,2),
    formulario_hermano INTEGER REFERENCES sld_formulario_libro(id) ON DELETE SET NULL,
    formula_archivo   VARCHAR(256),
    columnas          INTEGER,
    filas             INTEGER,
    copias            INTEGER,
    propiedad         VARCHAR(30),
    etiquetas         BOOLEAN DEFAULT FALSE,
    orden             INTEGER,
    UNIQUE (empresa, nombre)
);

CREATE TABLE IF NOT EXISTS sld_formulario_libro_parametro (
    formulario  INTEGER NOT NULL REFERENCES sld_formulario_libro(id) ON DELETE CASCADE ON UPDATE CASCADE,
    parametro   VARCHAR(50) NOT NULL,
    descripcion VARCHAR(100),
    texto       VARCHAR(255),
    x           NUMERIC(6,2),
    y           NUMERIC(6,2),
    ancho       NUMERIC(6,2),
    alto        NUMERIC(6,2),
    orden       INTEGER,
    alignment        VARCHAR(12),
    font             VARCHAR(60),
    border_color     VARCHAR(11),
    background_color VARCHAR(11),
    auto_height      BOOLEAN DEFAULT FALSE,
    print            BOOLEAN DEFAULT TRUE,
    condicion        VARCHAR(256),
    PRIMARY KEY (formulario, parametro)
);

-- -----------------------------------------------------------------------------
-- 15. LOGIN Y PERMISOS (app-native, sin fuente en MySQL — ver sección "Login y
--     permisos" de MIGRACION_BITACORA.md: una re-migración vacía estas tablas
--     salvo el usuario admin sembrado más abajo)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sys_grupo (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    orden       INTEGER
);

CREATE TABLE IF NOT EXISTS sys_usuario (
    id            SERIAL PRIMARY KEY,
    usuario       VARCHAR(50) NOT NULL UNIQUE,
    nombre        VARCHAR(100) NOT NULL,
    password_hash VARCHAR(60) NOT NULL,
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login  TIMESTAMP,
    creado        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sys_usuario_grupo (
    usuario INTEGER NOT NULL REFERENCES sys_usuario(id) ON DELETE CASCADE ON UPDATE CASCADE,
    grupo   INTEGER NOT NULL REFERENCES sys_grupo(id)   ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (usuario, grupo)
);

-- modulo: 'sueldos' | 'configuracion' | 'seguridad' — validado en código
-- (constante MODULOS en el backend), sin CHECK constraint, para no exigir
-- un ALTER el día que se sumen módulos (contabilidad/iva).
CREATE TABLE IF NOT EXISTS sys_permiso (
    grupo    INTEGER     NOT NULL REFERENCES sys_grupo(id) ON DELETE CASCADE ON UPDATE CASCADE,
    modulo   VARCHAR(30) NOT NULL,
    ver      BOOLEAN NOT NULL DEFAULT FALSE,
    crear    BOOLEAN NOT NULL DEFAULT FALSE,
    editar   BOOLEAN NOT NULL DEFAULT FALSE,
    eliminar BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (grupo, modulo)
);

-- Tabla de sesiones para connect-pg-simple — nombres/tipos de columna fijos
-- por la librería, no son convención propia del proyecto.
CREATE TABLE IF NOT EXISTS sys_sesion (
    sid    VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
    sess   JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sys_sesion_expire ON sys_sesion (expire);

-- Seed idempotente: grupo Administradores con permiso total + usuario admin.
-- Password por defecto 'admin123' — cambiar después del primer login (mismo
-- patrón que el "root"/"Usuario Administrador" sembrado en el sistema legacy).
INSERT INTO sys_grupo (id, nombre, descripcion, orden)
VALUES (1, 'Administradores', 'Acceso total al sistema', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO sys_permiso (grupo, modulo, ver, crear, editar, eliminar)
SELECT 1, m, TRUE, TRUE, TRUE, TRUE
FROM unnest(ARRAY['sueldos','configuracion','seguridad']) AS m
ON CONFLICT (grupo, modulo) DO NOTHING;

INSERT INTO sys_usuario (id, usuario, nombre, password_hash, activo)
VALUES (1, 'admin', 'Usuario Administrador', '$2b$10$Qz1SulMlykNmMnY1PO4QA.vVf6KeqTO/W58w609qKGpAJN772Is7q', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO sys_usuario_grupo (usuario, grupo) VALUES (1, 1)
ON CONFLICT DO NOTHING;

SELECT setval('sys_grupo_id_seq',   (SELECT COALESCE(MAX(id), 1) FROM sys_grupo));
SELECT setval('sys_usuario_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sys_usuario));

COMMIT;
