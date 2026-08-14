-- Metadatos de diseño de Recibo de Sueldo y Libro de Sueldos (menú Informes).
-- Guardan la configuración de formato (orientación, márgenes, parámetros con
-- posición X/Y/Ancho/Alto) tal como la exponía el sistema legacy. Por ahora
-- son solo gestión de metadatos: el PDF real (backend/src/pdf/*) usa una
-- plantilla fija en código, no interpreta estas filas — ver plan de Informes.
BEGIN;

CREATE TABLE IF NOT EXISTS sld_formulario_recibo (
    id                VARCHAR(20) PRIMARY KEY,
    descripcion       VARCHAR(50),
    orientacion       VARCHAR(12) CHECK (orientacion IN ('VERTICAL','HORIZONTAL')) DEFAULT 'VERTICAL',
    pagina            VARCHAR(8)  CHECK (pagina IN ('A4','A5','TICKET','LEGAL','LETTER','CUSTOM')) DEFAULT 'A4',
    margen_superior   NUMERIC(5,2),
    margen_inferior   NUMERIC(5,2),
    margen_izquierdo  NUMERIC(5,2),
    margen_derecho    NUMERIC(5,2),
    formulario_hermano VARCHAR(20),
    formula_archivo   VARCHAR(256),
    columnas          INTEGER,
    filas             INTEGER,
    copias            INTEGER,
    propiedad         VARCHAR(30),
    etiquetas         BOOLEAN DEFAULT FALSE,
    orden             INTEGER
);

CREATE TABLE IF NOT EXISTS sld_formulario_recibo_parametro (
    formulario  VARCHAR(20) NOT NULL REFERENCES sld_formulario_recibo(id) ON DELETE CASCADE ON UPDATE CASCADE,
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
    id                VARCHAR(20) PRIMARY KEY,
    descripcion       VARCHAR(50),
    orientacion       VARCHAR(12) CHECK (orientacion IN ('VERTICAL','HORIZONTAL')) DEFAULT 'HORIZONTAL',
    pagina            VARCHAR(8)  CHECK (pagina IN ('A4','A5','TICKET','LEGAL','LETTER','CUSTOM')) DEFAULT 'A4',
    margen_superior   NUMERIC(5,2),
    margen_inferior   NUMERIC(5,2),
    margen_izquierdo  NUMERIC(5,2),
    margen_derecho    NUMERIC(5,2),
    formulario_hermano VARCHAR(20),
    formula_archivo   VARCHAR(256),
    columnas          INTEGER,
    filas             INTEGER,
    copias            INTEGER,
    propiedad         VARCHAR(30),
    etiquetas         BOOLEAN DEFAULT FALSE,
    orden             INTEGER
);

CREATE TABLE IF NOT EXISTS sld_formulario_libro_parametro (
    formulario  VARCHAR(20) NOT NULL REFERENCES sld_formulario_libro(id) ON DELETE CASCADE ON UPDATE CASCADE,
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
