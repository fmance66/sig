-- Módulo Contabilidad — Coeficientes de ajuste por inflación.
--
-- A diferencia del resto de las tablas cnt_*, esta NO lleva columna `empresa`:
-- en el legacy vive en la base "master" (una sola serie de índices, no una por
-- empresa) porque el índice de inflación (IPIM/IPC) es el mismo para todas las
-- compañías. `indice_cierre`/`coeficiente` se guardan acá solo a título
-- informativo (así vino el legacy) — el proceso de Ajuste por Inflación
-- calcula su propio coeficiente en memoria a partir de la fecha de cierre que
-- elija cada empresa/ejercicio, sin pisar estas columnas (dos empresas pueden
-- cerrar en fechas distintas y no deben contaminarse la una a la otra).

BEGIN;

CREATE TABLE IF NOT EXISTS cnt_coeficiente (
    periodo       DATE NOT NULL,
    indice        NUMERIC(10,4),
    indice_cierre NUMERIC(10,4),
    coeficiente   NUMERIC(16,12),
    PRIMARY KEY (periodo)
);

INSERT INTO sys_permiso (grupo, modulo, ver, crear, editar, eliminar)
VALUES (1, 'contabilidad', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (grupo, modulo) DO NOTHING;

COMMIT;
