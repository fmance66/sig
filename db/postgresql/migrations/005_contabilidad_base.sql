-- Módulo Contabilidad — primera etapa (base: Plan de Cuentas, Centros de Costo,
-- Leyendas, Ejercicios). Tablas nuevas, sin datos legacy migrados todavía (los
-- dumps MySQL tienen cnt_cuenta/cnt_centro_de_costo/etc. poblados por empresa,
-- pero la migración de esos datos queda para una etapa posterior).
--
-- Mismo patrón multi-empresa que sld_concepto: PK compuesta (id, empresa) para
-- que la empresa viaje siempre en la URL de la API, no solo como filtro opcional.

BEGIN;

CREATE TABLE IF NOT EXISTS cnt_cuenta (
    id          VARCHAR(20) NOT NULL,
    empresa     INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    descripcion VARCHAR(100),
    saldo       VARCHAR(5)  CHECK (saldo IN ('DEBE','HABER')),
    naturaleza  VARCHAR(11) CHECK (naturaleza IN ('PATRIMONIAL','RESULTADO')),
    imputable   BOOLEAN     NOT NULL DEFAULT FALSE,
    monetaria   BOOLEAN     NOT NULL DEFAULT FALSE,
    -- Texto libre, no ENUM: el legacy tiene esquemas distintos entre empresas
    -- (2 de 6 con enum RUBRO/CUENTA/SUBCUENTA/RECPAM, el resto varchar libre).
    tipo        VARCHAR(50),
    jerarquia   VARCHAR(30),
    nivel       INTEGER,
    leyenda     VARCHAR(256),
    orden       INTEGER,
    id_padre    VARCHAR(20),
    PRIMARY KEY (id, empresa),
    -- SET NULL, no CASCADE: borrar una cuenta padre no debe arrastrar a sus hijas
    -- (lección de MIGRACION_BITACORA.md sobre auto-FK con CASCADE mal puesto).
    FOREIGN KEY (id_padre, empresa) REFERENCES cnt_cuenta(id, empresa) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS cnt_centro_de_costo (
    id          VARCHAR(20) NOT NULL,
    empresa     INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    descripcion VARCHAR(50),
    orden       INTEGER,
    PRIMARY KEY (id, empresa)
);

-- Prorrateo de cuenta entre centros de costo (pestaña "Centros de Costo" del
-- modal "Cuenta" en el sistema original) — no tiene sentido sin la cuenta o el
-- centro de costo, CASCADE es correcto acá.
CREATE TABLE IF NOT EXISTS cnt_prorrateo (
    cuenta          VARCHAR(20) NOT NULL,
    centro_de_costo VARCHAR(20) NOT NULL,
    empresa         INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    porcentaje      NUMERIC(5,2),
    PRIMARY KEY (cuenta, centro_de_costo, empresa),
    FOREIGN KEY (cuenta, empresa)          REFERENCES cnt_cuenta(id, empresa)          ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (centro_de_costo, empresa) REFERENCES cnt_centro_de_costo(id, empresa) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Catálogo de textos frecuentes para asientos. El legacy no tiene PK propia
-- (solo leyenda+orden); se agrega id SERIAL como PK técnica.
CREATE TABLE IF NOT EXISTS cnt_leyenda (
    id      SERIAL  PRIMARY KEY,
    empresa INTEGER NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    leyenda VARCHAR(128),
    orden   INTEGER
);

CREATE TABLE IF NOT EXISTS cnt_ejercicio (
    id              VARCHAR(10) NOT NULL,
    empresa         INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    descripcion     VARCHAR(50),
    fecha_desde     DATE        NOT NULL,
    fecha_hasta     DATE        NOT NULL,
    estado          VARCHAR(8)  CHECK (estado IN ('ABIERTO','CERRADO','ACTIVO')) DEFAULT 'ABIERTO',
    codificacion    VARCHAR(10) CHECK (codificacion IN ('JERARQUIA','CUENTA')) DEFAULT 'JERARQUIA',
    ordenamiento    VARCHAR(10) CHECK (ordenamiento IN ('JERARQUIA','MOVIMIENTO')) DEFAULT 'MOVIMIENTO',
    leyenda_asiento BOOLEAN     NOT NULL DEFAULT TRUE,
    leyenda_cuenta  BOOLEAN     NOT NULL DEFAULT FALSE,
    secuencia       INTEGER,
    PRIMARY KEY (id, empresa)
);

-- Habilita el módulo para el grupo Administradores, igual que sueldos/configuracion/seguridad.
INSERT INTO sys_permiso (grupo, modulo, ver, crear, editar, eliminar)
VALUES (1, 'contabilidad', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (grupo, modulo) DO NOTHING;

COMMIT;
