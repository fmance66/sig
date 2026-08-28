-- OBSOLETO: plegado en db/postgresql/01_schema.sql (sección 14, junto con 003), ver
-- MIGRACION_BITACORA.md. Se conserva solo como referencia histórica; no ejecutar
-- contra una base nueva ni contra la base actual.
--
-- Metadatos de diseño de Recibo de Sueldo y Libro de Sueldos (menú Informes).
-- Guardan la configuración de formato (orientación, márgenes, parámetros con
-- posición X/Y/Ancho/Alto) tal como la exponía el sistema legacy. Por ahora
-- son solo gestión de metadatos: el PDF real (backend/src/pdf/*) usa una
-- plantilla fija en código, no interpreta estas filas — ver plan de Informes.
BEGIN;

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
    UNIQUE (empresa, nombre)
);

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
    PRIMARY KEY (formulario, parametro)
);

COMMIT;
