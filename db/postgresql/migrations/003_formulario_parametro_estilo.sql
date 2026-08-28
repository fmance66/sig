-- OBSOLETO: plegado en db/postgresql/01_schema.sql (sección 14, junto con 002), ver
-- MIGRACION_BITACORA.md. Se conserva solo como referencia histórica; no ejecutar
-- contra una base nueva ni contra la base actual.
--
-- Columnas de estilo del diseño legacy que quedaron afuera de 002 (solo se habían migrado
-- x/y/ancho/alto/texto/orden). Hacen falta para que el intérprete de layout del PDF pueda
-- distinguir cajas de texto (alignment/font) de rectángulos (border_color/background_color)
-- y respetar los flags print/condicion/auto_height del diseño original.
BEGIN;

ALTER TABLE sld_formulario_recibo_parametro
    ADD COLUMN IF NOT EXISTS alignment        VARCHAR(12),
    ADD COLUMN IF NOT EXISTS font             VARCHAR(60),
    ADD COLUMN IF NOT EXISTS border_color     VARCHAR(11),
    ADD COLUMN IF NOT EXISTS background_color VARCHAR(11),
    ADD COLUMN IF NOT EXISTS auto_height      BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS print            BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS condicion        VARCHAR(256);

ALTER TABLE sld_formulario_libro_parametro
    ADD COLUMN IF NOT EXISTS alignment        VARCHAR(12),
    ADD COLUMN IF NOT EXISTS font             VARCHAR(60),
    ADD COLUMN IF NOT EXISTS border_color     VARCHAR(11),
    ADD COLUMN IF NOT EXISTS background_color VARCHAR(11),
    ADD COLUMN IF NOT EXISTS auto_height      BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS print            BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS condicion        VARCHAR(256);

COMMIT;
