-- Módulo I.V.A. — Fase 1: tablas comunes, Compras, Ventas, Períodos.
--
-- Igual que el resto del proyecto, el legacy era una BBDD por empresa: toda tabla
-- que en MySQL vivía dentro de la BBDD de cada empresa gana acá una columna `empresa`
-- (FK a sys_empresa) como parte de la PK. Los catálogos que salen idénticos en las 6
-- empresas del dump (`bas_condicion_iva`, `iva_tipo_afip` — listas fijas de AFIP)
-- quedan GLOBALES, sin `empresa`, igual que bas_moneda/bas_pais.
--
-- `iva_comprobante.empresa` en el legacy YA es una columna de negocio (FK a
-- sys_empresa, usada para lotes/consolidación entre razones sociales relacionadas,
-- ver `empresa_lote`/"Lote" en el tab Datos del comprobante) — no tiene nada que ver
-- con el tenant. Para no chocar de nombre con el `empresa` tenant que agregamos acá,
-- esa columna de negocio se renombra a `empresa_relacionada`.
--
-- Fuera de esta fase (ver plan): tab "AFIP" de Impuesto (`iva_fe_tributo`), Facturación
-- Electrónica, Certificado de Retención/Recibo (`iva_certificado`/`iva_recibo`, 0 filas
-- reales en los 6 dumps), Fórmulas de Asiento (depende de `cnt_modelo_asiento` con motor
-- de fórmulas, todavía no construido ni para Contabilidad) — por eso `modelo_asiento_cmp`,
-- `modelo_asiento_vta`, `modelo_asiento` (persona) y `fe_tributo`/`id_afip` (impuesto)
-- quedan como columnas sueltas sin FK, listas para cuando esos módulos existan.

BEGIN;

-- -----------------------------------------------------------------------------
-- Catálogos globales (idénticos en las 6 empresas del dump legacy)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bas_condicion_iva (
    id           VARCHAR(5) PRIMARY KEY,
    descripcion  VARCHAR(50),
    discriminado INTEGER,
    orden        INTEGER
);

-- Códigos oficiales de comprobante de AFIP (Facturas A/B/C, Notas de Débito/Crédito, etc).
-- Catálogo de referencia fijo, sin pantalla de gestión propia en esta fase.
CREATE TABLE IF NOT EXISTS iva_tipo_afip (
    id          VARCHAR(5) PRIMARY KEY,
    descripcion VARCHAR(100),
    tipo_sicore VARCHAR(5),
    orden       INTEGER
);

-- -----------------------------------------------------------------------------
-- Tablas comunes por-empresa
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bas_rubro (
    id          VARCHAR(20) NOT NULL,
    empresa     INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    descripcion VARCHAR(100),
    concepto    VARCHAR(10) CHECK (concepto IN ('PRODUCTO','SERVICIO','PRODSERV','BIENDEUSO','LOCACION')),
    modulo      VARCHAR(6)  CHECK (modulo IN ('COMPRA','VENTA')),
    alias       VARCHAR(20),
    color       VARCHAR(11),
    orden       INTEGER,
    visible     VARCHAR(20),
    id_padre    VARCHAR(20),
    PRIMARY KEY (id, empresa),
    FOREIGN KEY (id_padre, empresa) REFERENCES bas_rubro(id, empresa) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (visible, empresa)  REFERENCES cnt_cuenta(id, empresa) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS iva_condicion_venta (
    id          VARCHAR(20) NOT NULL,
    empresa     INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    descripcion VARCHAR(50),
    orden       INTEGER,
    PRIMARY KEY (id, empresa)
);

CREATE TABLE IF NOT EXISTS iva_modalidad (
    id          VARCHAR(20) NOT NULL,
    empresa     INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    descripcion VARCHAR(50),
    orden       INTEGER,
    PRIMARY KEY (id, empresa)
);

CREATE TABLE IF NOT EXISTS iva_impuesto (
    id               VARCHAR(20) NOT NULL,
    empresa          INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    nombre           VARCHAR(30),
    tipo             VARCHAR(15) CHECK (tipo IN ('NETO','EXENTO','NO_GRAVADO','IVA','IMPUESTO_1','IMPUESTO_2','IMPUESTO_3','IMPUESTO_4','IMPUESTO_5','IMPUESTO_6','IMPUESTO_7','IMPUESTO_8','IMPUESTO_9','AUXILIAR')),
    alicuota         NUMERIC(5,2),
    importe          NUMERIC(11,2),
    formula_alicuota VARCHAR(256),
    formula_importe  VARCHAR(256),
    calculo          VARCHAR(10) CHECK (calculo IN ('IMPORTE','IMPUESTO','INTERNO','COMISION')),
    alias            VARCHAR(10),
    color            VARCHAR(11),
    columna          INTEGER,
    shortcut         VARCHAR(10),
    orden            INTEGER,
    grupo            VARCHAR(20),
    provincia        VARCHAR(20) REFERENCES bas_provincia(provincia) ON DELETE SET NULL ON UPDATE CASCADE,
    -- fe_tributo: FK a iva_fe_tributo, tabla de Facturación Electrónica (fase 2).
    fe_tributo       VARCHAR(5),
    id_afip          VARCHAR(5),
    ddjj_iva         BOOLEAN DEFAULT FALSE,
    aplicacion       VARCHAR(11) CHECK (aplicacion IN ('COMPROBANTE','PERSONA','PRODUCTO')),
    PRIMARY KEY (id, empresa)
);

CREATE TABLE IF NOT EXISTS iva_tipo_comprobante (
    id                 VARCHAR(4) NOT NULL,
    empresa            INTEGER    NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    descripcion        VARCHAR(50),
    documento          VARCHAR(12) CHECK (documento IN ('FACTURA','FACTURA_NC','FACTURA_ND','DOCUMENTO')),
    saldo              VARCHAR(10) CHECK (saldo IN ('SUMA','RESTA','NO_CALCULA')),
    moneda             VARCHAR(5) REFERENCES bas_moneda(id) ON DELETE SET NULL ON UPDATE CASCADE,
    concepto_cmp       VARCHAR(10) CHECK (concepto_cmp IN ('PRODUCTO','SERVICIO','PRODSERV','BIENDEUSO','LOCACION')),
    concepto_vta       VARCHAR(10) CHECK (concepto_vta IN ('PRODUCTO','SERVICIO','PRODSERV','BIENDEUSO','LOCACION')),
    save_tipo          BOOLEAN DEFAULT FALSE,
    save_punto         BOOLEAN DEFAULT FALSE,
    campo_hasta        BOOLEAN DEFAULT FALSE,
    -- modelo_asiento_cmp/vta: FK a cnt_modelo_asiento, motor de fórmulas no construido.
    modelo_asiento_cmp VARCHAR(20),
    modelo_asiento_vta VARCHAR(20),
    color              VARCHAR(11),
    orden              INTEGER,
    PRIMARY KEY (id, empresa)
);

CREATE TABLE IF NOT EXISTS iva_tipo_letra (
    tipo      VARCHAR(4) NOT NULL,
    letra     CHAR(1)    NOT NULL,
    empresa   INTEGER    NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    punto     INTEGER,
    tipo_afip VARCHAR(5) REFERENCES iva_tipo_afip(id) ON DELETE SET NULL ON UPDATE CASCADE,
    PRIMARY KEY (tipo, letra, empresa),
    FOREIGN KEY (tipo, empresa) REFERENCES iva_tipo_comprobante(id, empresa) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS iva_modelo_comprobante (
    id            VARCHAR(20) NOT NULL,
    empresa       INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    descripcion   VARCHAR(50),
    modulo        VARCHAR(6) CHECK (modulo IN ('COMPRA','VENTA')),
    columna_total INTEGER,
    fila_total    INTEGER,
    orden         INTEGER,
    PRIMARY KEY (id, empresa)
);

-- El legacy usa (modelo,impuesto,rubro) como clave única con `rubro` NULL-able; en vez
-- de forzar un valor sentinela para meterlo en la PK (como se evaluó y se descartó),
-- se agrega un id técnico SERIAL, mismo criterio que cnt_leyenda.
CREATE TABLE IF NOT EXISTS iva_modelo_impuesto (
    id               SERIAL PRIMARY KEY,
    modelo           VARCHAR(20) NOT NULL,
    impuesto         VARCHAR(20) NOT NULL,
    rubro            VARCHAR(20),
    empresa          INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    alicuota         NUMERIC(5,2),
    importe          NUMERIC(11,2),
    formula_alicuota VARCHAR(256),
    formula_importe  VARCHAR(256),
    etiqueta         VARCHAR(50),
    columna          INTEGER,
    fila             INTEGER,
    UNIQUE (modelo, impuesto, rubro, empresa),
    FOREIGN KEY (modelo, empresa)   REFERENCES iva_modelo_comprobante(id, empresa) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (impuesto, empresa) REFERENCES iva_impuesto(id, empresa)          ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (rubro, empresa)    REFERENCES bas_rubro(id, empresa)             ON DELETE SET NULL ON UPDATE CASCADE
);

-- Tipo+letra de comprobante -> modelo de impuestos por defecto para esa combinación.
CREATE TABLE IF NOT EXISTS iva_tipo_modelo (
    tipo    VARCHAR(4)  NOT NULL,
    letra   CHAR(1)     NOT NULL,
    modelo  VARCHAR(20) NOT NULL,
    empresa INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (tipo, letra, modelo, empresa),
    FOREIGN KEY (tipo, empresa)   REFERENCES iva_tipo_comprobante(id, empresa)   ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (modelo, empresa) REFERENCES iva_modelo_comprobante(id, empresa) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS iva_punto_de_venta (
    punto          INTEGER NOT NULL,
    empresa        INTEGER NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    nombre         VARCHAR(50),
    rubro          VARCHAR(20),
    rubro_auto     BOOLEAN DEFAULT TRUE,
    condicion      VARCHAR(20),
    condicion_auto BOOLEAN DEFAULT TRUE,
    activo         BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (punto, empresa),
    FOREIGN KEY (rubro, empresa)     REFERENCES bas_rubro(id, empresa)          ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (condicion, empresa) REFERENCES iva_condicion_venta(id, empresa) ON DELETE SET NULL ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- Proveedor / Cliente (unificados por `modulo`) e Ítems
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS iva_persona (
    modulo           VARCHAR(6)  NOT NULL CHECK (modulo IN ('COMPRA','VENTA')),
    id               VARCHAR(20) NOT NULL,
    empresa          INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    razon_social     VARCHAR(100),
    nombre_comercial VARCHAR(100),
    tipo_documento   VARCHAR(5),
    numero_documento VARCHAR(15),
    condicion_iva    VARCHAR(5) REFERENCES bas_condicion_iva(id) ON DELETE SET NULL ON UPDATE CASCADE,
    numero_ib        VARCHAR(15),
    grupo            VARCHAR(50),
    direccion        VARCHAR(100),
    localidad        VARCHAR(40),
    provincia        VARCHAR(20) REFERENCES bas_provincia(provincia) ON DELETE SET NULL ON UPDATE CASCADE,
    pais             VARCHAR(20),
    cpa              VARCHAR(10),
    orden            INTEGER,
    observaciones    TEXT,
    tipo             VARCHAR(4),
    letra            CHAR(1),
    punto            INTEGER,
    modelo           VARCHAR(20),
    moneda           VARCHAR(5) REFERENCES bas_moneda(id) ON DELETE SET NULL ON UPDATE CASCADE,
    rubro            VARCHAR(20),
    condicion_venta  VARCHAR(20),
    -- modelo_asiento: FK a cnt_modelo_asiento, motor de fórmulas no construido.
    modelo_asiento   VARCHAR(20),
    PRIMARY KEY (modulo, id, empresa),
    FOREIGN KEY (tipo, letra, modelo, empresa) REFERENCES iva_tipo_modelo(tipo, letra, modelo, empresa) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (rubro, empresa)           REFERENCES bas_rubro(id, empresa)           ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (condicion_venta, empresa) REFERENCES iva_condicion_venta(id, empresa) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS iva_item (
    modulo      VARCHAR(6)  NOT NULL CHECK (modulo IN ('COMPRA','VENTA')),
    id          VARCHAR(20) NOT NULL,
    empresa     INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    descripcion VARCHAR(100),
    grupo       VARCHAR(50),
    unidad      VARCHAR(5),
    ivainc      BOOLEAN,
    alicuota    NUMERIC(5,2),
    rubro       VARCHAR(20),
    calcular    BOOLEAN,
    orden       INTEGER,
    PRIMARY KEY (modulo, id, empresa),
    FOREIGN KEY (rubro, empresa) REFERENCES bas_rubro(id, empresa) ON DELETE SET NULL ON UPDATE CASCADE
);

-- -----------------------------------------------------------------------------
-- Períodos (Menubar → Períodos)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS iva_liquidacion (
    periodo       VARCHAR(10) NOT NULL,
    empresa       INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha_desde   DATE,
    fecha_hasta   DATE,
    prorrateo     NUMERIC(5,2),
    estado        VARCHAR(8) CHECK (estado IN ('ABIERTA','CERRADA','ACTIVA')) DEFAULT 'ABIERTA',
    modulo_activo VARCHAR(6) CHECK (modulo_activo IN ('COMPRA','VENTA')) DEFAULT 'COMPRA',
    PRIMARY KEY (periodo, empresa)
);

-- -----------------------------------------------------------------------------
-- Comprobante (header + ítems + impuestos), Compras y Ventas unificados por `modulo`
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS iva_comprobante (
    modulo             VARCHAR(6)  NOT NULL CHECK (modulo IN ('COMPRA','VENTA')),
    tipo               VARCHAR(4)  NOT NULL,
    comprobante        VARCHAR(16) NOT NULL,
    persona            VARCHAR(20) NOT NULL,
    empresa            INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha              DATE,
    periodo            VARCHAR(10),
    servicio_desde     DATE,
    servicio_hasta     DATE,
    numero_hasta       VARCHAR(8),
    numero_aux         VARCHAR(20),
    -- empresa_relacionada: columna de negocio del legacy (lotes/consolidación entre
    -- razones sociales relacionadas), sin relación con el `empresa` tenant de arriba.
    empresa_relacionada INTEGER REFERENCES sys_empresa(id) ON DELETE SET NULL ON UPDATE CASCADE,
    empresa_lote       VARCHAR(10),
    moneda             VARCHAR(5) REFERENCES bas_moneda(id) ON DELETE SET NULL ON UPDATE CASCADE,
    cotizacion         NUMERIC(10,4) DEFAULT 1.0000,
    concepto           VARCHAR(10) CHECK (concepto IN ('PRODUCTO','SERVICIO','PRODSERV','BIENDEUSO','LOCACION')),
    rubro              VARCHAR(20),
    provincia          VARCHAR(20) REFERENCES bas_provincia(provincia) ON DELETE SET NULL ON UPDATE CASCADE,
    condicion_venta    VARCHAR(20),
    prorrateo          NUMERIC(5,2),
    tipo_adj           VARCHAR(4),
    comprobante_adj    VARCHAR(16),
    anulado            BOOLEAN DEFAULT FALSE,
    razon_social       VARCHAR(100),
    tipo_documento     VARCHAR(5),
    numero_documento   VARCHAR(15),
    condicion_iva      VARCHAR(5) REFERENCES bas_condicion_iva(id) ON DELETE SET NULL ON UPDATE CASCADE,
    numero_ib          VARCHAR(15),
    localidad          VARCHAR(40),
    observaciones      TEXT,
    subtotal           NUMERIC(17,2),
    neto               NUMERIC(17,2),
    exento             NUMERIC(17,2),
    nogravado          NUMERIC(17,2),
    alicuotas          VARCHAR(30),
    iva                NUMERIC(17,2),
    impuesto_1         NUMERIC(17,2) DEFAULT 0,
    impuesto_2         NUMERIC(17,2) DEFAULT 0,
    impuesto_3         NUMERIC(17,2) DEFAULT 0,
    impuesto_4         NUMERIC(17,2) DEFAULT 0,
    impuesto_5         NUMERIC(17,2) DEFAULT 0,
    impuesto_6         NUMERIC(17,2) DEFAULT 0,
    impuesto_7         NUMERIC(17,2) DEFAULT 0,
    impuesto_8         NUMERIC(17,2) DEFAULT 0,
    impuesto_9         NUMERIC(17,2) DEFAULT 0,
    total              NUMERIC(17,2),
    recibido           NUMERIC(17,2),
    cae                VARCHAR(14),
    vto_cae            DATE,
    orden              INTEGER,
    PRIMARY KEY (modulo, tipo, comprobante, persona, empresa),
    FOREIGN KEY (tipo, empresa)            REFERENCES iva_tipo_comprobante(id, empresa)  ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (modulo, persona, empresa) REFERENCES iva_persona(modulo, id, empresa)   ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (periodo, empresa)         REFERENCES iva_liquidacion(periodo, empresa)  ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (rubro, empresa)           REFERENCES bas_rubro(id, empresa)             ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (condicion_venta, empresa) REFERENCES iva_condicion_venta(id, empresa)   ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS iva_comprobante_item (
    modulo      VARCHAR(6)  NOT NULL,
    tipo        VARCHAR(4)  NOT NULL,
    comprobante VARCHAR(16) NOT NULL,
    persona     VARCHAR(20) NOT NULL,
    item        VARCHAR(20) NOT NULL,
    empresa     INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    cantidad    NUMERIC(13,4) DEFAULT 0,
    precio      NUMERIC(16,4) DEFAULT 0,
    ivainc      BOOLEAN,
    importe     NUMERIC(17,2) DEFAULT 0,
    alicuota    NUMERIC(5,2),
    iva         NUMERIC(17,2),
    interno     NUMERIC(17,2),
    PRIMARY KEY (modulo, tipo, comprobante, persona, item, empresa),
    FOREIGN KEY (modulo, tipo, comprobante, persona, empresa) REFERENCES iva_comprobante(modulo, tipo, comprobante, persona, empresa) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (modulo, item, empresa)                       REFERENCES iva_item(modulo, id, empresa)                                ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS iva_comprobante_impuesto (
    id          SERIAL PRIMARY KEY,
    modulo      VARCHAR(6)  NOT NULL,
    tipo        VARCHAR(4)  NOT NULL,
    comprobante VARCHAR(16) NOT NULL,
    persona     VARCHAR(20) NOT NULL,
    impuesto    VARCHAR(20) NOT NULL,
    rubro       VARCHAR(20),
    empresa     INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    alicuota    NUMERIC(5,2),
    importe     NUMERIC(17,2),
    calculo     CHAR(1) CHECK (calculo IN ('F','M')),
    imputacion  DATE,
    columna     INTEGER,
    fila        INTEGER,
    UNIQUE (modulo, tipo, comprobante, persona, impuesto, rubro, empresa),
    FOREIGN KEY (modulo, tipo, comprobante, persona, empresa) REFERENCES iva_comprobante(modulo, tipo, comprobante, persona, empresa) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (impuesto, empresa)                           REFERENCES iva_impuesto(id, empresa)                                    ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (rubro, empresa)                              REFERENCES bas_rubro(id, empresa)                                       ON DELETE SET NULL ON UPDATE CASCADE
);

COMMIT;
