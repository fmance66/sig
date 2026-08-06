-- =============================================================================
-- MIGRACIÓN DE DATOS: MySQL 5.5 → PostgreSQL 16
-- =============================================================================
-- INSTRUCCIONES DE USO
-- =============================================================================
--
-- PASO 1 — Exportar datos de MySQL (ejecutar en la máquina con MySQL):
--
--   Para cada base (master, "icp sa", "minucci pablo", etc.):
--
--   mysqldump -u root -p \
--     --no-create-info \
--     --complete-insert \
--     --default-character-set=utf8 \
--     --skip-set-charset \
--     --compatible=ansi \
--     --tab=/tmp/export/icp_sa/ \
--     icp_sa \
--     sld_actividad_laboral sld_campo_historial sld_codigo_zona \
--     sld_condicion_laboral sld_convenio sld_categoria sld_categoria_periodo \
--     sld_concepto sld_concepto_lsd sld_concepto_general sld_concepto_de_grupo \
--     sld_concepto_grupo sld_empleado sld_empleado_afip sld_empleado_concepto \
--     sld_familiar sld_feriado sld_formula_auxiliar sld_grupo \
--     sld_grupo_de_conceptos sld_historial sld_historial_empleado sld_horario \
--     sld_incapacidad sld_jornada_laboral sld_liquidacion sld_modalidad_contrato \
--     sld_motivo_ausentismo sld_novedad sld_obra_social sld_presentismo \
--     sld_recibo sld_recibo_afip sld_recibo_concepto sld_recibo_empleado \
--     sld_sindicato sld_situacion_revista sld_tabla sld_fila sld_tipo_novedad \
--     bas_moneda bas_proyecto bas_provincia bas_localidad \
--     sys_empresa
--
-- PASO 2 — Importar en PostgreSQL (orden respeta dependencias FK):
--   El script a continuación asume que los datos ya están en tablas temporales
--   o en archivos CSV. Se puede adaptar para usar COPY FROM o INSERT SELECT.
--
-- PASO 3 — Verificar conteos finales (sección al final del archivo)
--
-- =============================================================================
-- NOTAS SOBRE DIFERENCIAS MySQL → PostgreSQL
-- =============================================================================
--
--  • Fechas '0000-00-00' → se convierten a NULL
--  • BOOLEAN: en MySQL llegan como 0/1; PostgreSQL acepta eso directamente
--    con el cast implícito si la columna es BOOLEAN
--  • bit(1): en MySQL llegan como \0 o \1 en dumps texto; convertir a 0/1
--  • BYTEA: los blobs llegan en formato hexadecimal en pg_dump;
--    para importar desde MySQL usar pgloader o convertir manualmente
--  • Charset: asegurar que el export de MySQL use --default-character-set=utf8
--    y que la conexión PostgreSQL sea UTF-8
--
-- =============================================================================

BEGIN;

-- =============================================================================
-- FUNCIÓN AUXILIAR: convierte fecha '0000-00-00' en NULL
-- =============================================================================
CREATE OR REPLACE FUNCTION safe_date(txt TEXT) RETURNS DATE AS $$
BEGIN
    IF txt IS NULL OR txt = '' OR txt = '0000-00-00' OR txt = '00/00/0000' THEN
        RETURN NULL;
    END IF;
    RETURN txt::DATE;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ORDEN DE CARGA (respeta dependencias FK)
-- Usar COPY o INSERT en este orden exacto
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- NIVEL 0 — sin FKs
-- ─────────────────────────────────────────────────────────────────────────────

-- bas_moneda
-- COPY bas_moneda (id, nombre, simbolo, simbolos, cotizacion, color, icono, orden)
-- FROM '/tmp/export/master/bas_moneda.csv' CSV HEADER ENCODING 'UTF8';

-- sys_empresa  (nota: la columna 'empresa' es FK self-referencing; cargar en dos pasadas)
-- INSERT INTO sys_empresa (id, sistema, version, razon_social, nombre_comercial, cuit,
--   numero_ib, condicion_iva, actividad, inicio, baja, direccion, localidad, provincia,
--   cpa, zona, telefono, email, webpage, logo, observaciones, mail_address, mail_account,
--   mail_username, mail_password, smtp_host, smtp_port, empresa, login, cloud, workspace,
--   cloudspace, expired_date, backup_date, cloud_date, orden)
-- SELECT id, sistema, version, razon_social, nombre_comercial, cuit,
--   numero_ib, condicion_iva, actividad, safe_date(inicio), NULL,
--   direccion, localidad, provincia, cpa, zona, telefono, email, webpage, NULL,
--   observaciones, mail_address, mail_account, mail_username, mail_password,
--   smtp_host, smtp_port::INTEGER, NULL, -- empresa FK en segunda pasada
--   login::BOOLEAN, cloud::BOOLEAN, workspace, cloudspace,
--   expired_date::BOOLEAN, backup_date::TIMESTAMP, cloud_date::TIMESTAMP, orden::INTEGER
-- FROM mysql_sys_empresa;
--
-- UPDATE sys_empresa e SET empresa = m.empresa
-- FROM mysql_sys_empresa m WHERE e.id = m.id AND m.empresa IS NOT NULL;

-- bas_provincia
-- COPY bas_provincia FROM '/tmp/export/master/bas_provincia.csv' CSV HEADER ENCODING 'UTF8';

-- bas_localidad
-- COPY bas_localidad FROM '/tmp/export/master/bas_localidad.csv' CSV HEADER ENCODING 'UTF8';

-- bas_proyecto
-- INSERT INTO bas_proyecto (id, descripcion, grupo, fecha, fecha_fin, horas, valor_hora,
--   presupuesto, ejecutado, avance, moneda, observaciones, alias, color, orden, visible, id_padre)
-- SELECT id, descripcion, grupo, safe_date(fecha), safe_date(fecha_fin), horas::INTEGER,
--   valor_hora::NUMERIC, presupuesto::NUMERIC, ejecutado::NUMERIC, avance::NUMERIC,
--   moneda, observaciones, alias, color, orden::INTEGER, visible::BOOLEAN, NULL
-- FROM mysql_bas_proyecto;
-- UPDATE bas_proyecto p SET id_padre = m.id_padre
-- FROM mysql_bas_proyecto m WHERE p.id = m.id AND m.id_padre IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- NIVEL 1 — catálogos sld_ sin FKs cruzadas
-- ─────────────────────────────────────────────────────────────────────────────

-- Cada tabla se puede cargar con COPY directo desde CSV:
-- COPY sld_actividad_laboral    FROM '/tmp/export/<empresa>/sld_actividad_laboral.csv'    CSV HEADER ENCODING 'UTF8';
-- COPY sld_campo_historial      FROM '/tmp/export/<empresa>/sld_campo_historial.csv'      CSV HEADER ENCODING 'UTF8';
-- COPY sld_codigo_zona          FROM '/tmp/export/<empresa>/sld_codigo_zona.csv'          CSV HEADER ENCODING 'UTF8';
-- COPY sld_condicion_laboral    FROM '/tmp/export/<empresa>/sld_condicion_laboral.csv'    CSV HEADER ENCODING 'UTF8';
-- COPY sld_feriado              FROM '/tmp/export/<empresa>/sld_feriado.csv'              CSV HEADER ENCODING 'UTF8';
-- COPY sld_formula_auxiliar     FROM '/tmp/export/<empresa>/sld_formula_auxiliar.csv'     CSV HEADER ENCODING 'UTF8';
-- COPY sld_grupo                FROM '/tmp/export/<empresa>/sld_grupo.csv'                CSV HEADER ENCODING 'UTF8';
-- COPY sld_grupo_de_conceptos   FROM '/tmp/export/<empresa>/sld_grupo_de_conceptos.csv'   CSV HEADER ENCODING 'UTF8';
-- COPY sld_incapacidad          FROM '/tmp/export/<empresa>/sld_incapacidad.csv'          CSV HEADER ENCODING 'UTF8';
-- COPY sld_modalidad_contrato   FROM '/tmp/export/<empresa>/sld_modalidad_contrato.csv'   CSV HEADER ENCODING 'UTF8';
-- COPY sld_motivo_ausentismo    FROM '/tmp/export/<empresa>/sld_motivo_ausentismo.csv'    CSV HEADER ENCODING 'UTF8';
-- COPY sld_obra_social          FROM '/tmp/export/<empresa>/sld_obra_social.csv'          CSV HEADER ENCODING 'UTF8';
-- COPY sld_sindicato            FROM '/tmp/export/<empresa>/sld_sindicato.csv'            CSV HEADER ENCODING 'UTF8';
-- COPY sld_situacion_revista    FROM '/tmp/export/<empresa>/sld_situacion_revista.csv'    CSV HEADER ENCODING 'UTF8';
-- COPY sld_tabla                FROM '/tmp/export/<empresa>/sld_tabla.csv'                CSV HEADER ENCODING 'UTF8';
-- COPY sld_tipo_novedad         FROM '/tmp/export/<empresa>/sld_tipo_novedad.csv'         CSV HEADER ENCODING 'UTF8';

-- ─────────────────────────────────────────────────────────────────────────────
-- NIVEL 2 — conceptos
-- ─────────────────────────────────────────────────────────────────────────────

-- sld_concepto (columna enum → VARCHAR, activo tinyint → BOOLEAN)
-- INSERT INTO sld_concepto (id, id_afip, descripcion, columna, simbolo_unidad,
--   decimales_unidad, unidad_visible, simbolo_unitario, decimales_unitario,
--   unitario_visible, simbolo_afip, campo_unidad, leyenda_unidad,
--   campo_importe, leyenda_importe, formula_unidad, formula_importe,
--   formula_unitario, formula_condicion, activo, orden)
-- SELECT id, id_afip, descripcion, columna, simbolo_unidad,
--   decimales_unidad::INTEGER, unidad_visible::BOOLEAN, simbolo_unitario, decimales_unitario,
--   unitario_visible::BOOLEAN, simbolo_afip, campo_unidad::BOOLEAN, leyenda_unidad,
--   campo_importe::BOOLEAN, leyenda_importe, formula_unidad, formula_importe,
--   formula_unitario, formula_condicion, activo::BOOLEAN, orden::INTEGER
-- FROM mysql_sld_concepto;

-- sld_concepto_lsd (todos los campos son tinyint(1) → BOOLEAN)
-- INSERT INTO sld_concepto_lsd SELECT
--   concepto,
--   aporte_sipa::BOOLEAN, aporte_inssjyp::BOOLEAN, aporte_obrasocial::BOOLEAN,
--   aporte_fsr::BOOLEAN, aporte_uatre::BOOLEAN, aporte_diferencial::BOOLEAN,
--   aporte_regespecial::BOOLEAN, aporte_libre1::BOOLEAN, aporte_libre2::BOOLEAN,
--   contribucion_sipa::BOOLEAN, contribucion_inssjyp::BOOLEAN, contribucion_obrasocial::BOOLEAN,
--   contribucion_fsr::BOOLEAN, contribucion_renatre::BOOLEAN, contribucion_aaff::BOOLEAN,
--   contribucion_fne::BOOLEAN, contribucion_lrt::BOOLEAN,
--   contribucion_libre1::BOOLEAN, contribucion_libre2::BOOLEAN, repetible::BOOLEAN
-- FROM mysql_sld_concepto_lsd;

-- COPY sld_concepto_general   FROM '...' CSV HEADER ENCODING 'UTF8';
-- COPY sld_concepto_grupo     FROM '...' CSV HEADER ENCODING 'UTF8';

-- ─────────────────────────────────────────────────────────────────────────────
-- NIVEL 3 — convenio y categorías
-- ─────────────────────────────────────────────────────────────────────────────

-- COPY sld_convenio           FROM '...' CSV HEADER ENCODING 'UTF8';
-- COPY sld_categoria          FROM '...' CSV HEADER ENCODING 'UTF8';

-- sld_categoria_periodo: fechas pueden ser '0000-00-00'
-- INSERT INTO sld_categoria_periodo (convenio, categoria, fecha, fecha_hasta, sueldo, adicional, auxiliar)
-- SELECT convenio, categoria, safe_date(fecha), safe_date(fecha_hasta),
--   sueldo::NUMERIC, adicional::NUMERIC, auxiliar::NUMERIC
-- FROM mysql_sld_categoria_periodo
-- WHERE fecha != '0000-00-00';

-- ─────────────────────────────────────────────────────────────────────────────
-- NIVEL 4 — liquidacion
-- ─────────────────────────────────────────────────────────────────────────────

-- INSERT INTO sld_liquidacion (periodo, tipo, estado, fecha, fecha_desde, fecha_hasta,
--   descripcion, concepto_predef, fecha_pago, lugar_pago, fecha_deposito,
--   periodo_deposito, banco_deposito, orden)
-- SELECT periodo, tipo, estado,
--   safe_date(fecha), safe_date(fecha_desde), safe_date(fecha_hasta),
--   descripcion, concepto_predef, safe_date(fecha_pago), lugar_pago,
--   safe_date(fecha_deposito), periodo_deposito, banco_deposito, orden::INTEGER
-- FROM mysql_sld_liquidacion;

-- ─────────────────────────────────────────────────────────────────────────────
-- NIVEL 5 — empleado (tabla central)
-- ─────────────────────────────────────────────────────────────────────────────

-- sld_empleado: foto → BYTEA (requiere conversión especial si viene como hex)
-- INSERT INTO sld_empleado (id, apellido, nombre, cuil, grupo, estado, tarea,
--   fecha_ingreso, fecha_egreso, fecha_antiguedad, antiguedad, sexo, fecha_nacimiento,
--   nacionalidad, estado_civil, tipo_documento, numero_documento, direccion, localidad,
--   provincia, cpa, telefono, email, foto, orden, convenio, categoria, sueldo, adicional,
--   auxiliar, dias, horas, porcentaje, jornada, proporcional, liquidacion, moneda,
--   vacaciones, obra_social, sindicato, proyecto, empresa, lugar_trabajo, banco, cuenta,
--   cbu, grupo_de_conceptos, observaciones)
-- SELECT id, apellido, nombre, cuil, grupo, estado, tarea,
--   safe_date(fecha_ingreso), safe_date(fecha_egreso), safe_date(fecha_antiguedad),
--   antiguedad::INTEGER, sexo, safe_date(fecha_nacimiento), nacionalidad, estado_civil,
--   tipo_documento, numero_documento, direccion, localidad, provincia, cpa, telefono, email,
--   NULL, -- foto: migrar por separado si se necesita
--   orden::INTEGER, convenio, categoria, sueldo::NUMERIC, adicional::NUMERIC, auxiliar::NUMERIC,
--   dias::NUMERIC, horas::NUMERIC, porcentaje::NUMERIC, jornada,
--   proporcional::BOOLEAN, liquidacion, moneda, vacaciones::INTEGER, obra_social,
--   sindicato, proyecto, empresa, lugar_trabajo, banco, cuenta, cbu,
--   grupo_de_conceptos, observaciones
-- FROM mysql_sld_empleado;

-- ─────────────────────────────────────────────────────────────────────────────
-- NIVEL 6 — sub-tablas de empleado
-- ─────────────────────────────────────────────────────────────────────────────

-- sld_empleado_afip
-- COPY sld_empleado_afip FROM '...' CSV HEADER ENCODING 'UTF8';

-- sld_empleado_concepto (vigencia_desde/hasta pueden ser '0000-00-00')
-- INSERT INTO sld_empleado_concepto (empleado, concepto, liquidacion, recibo,
--   descripcion, unidad_manual, importe_manual, vigencia_desde, vigencia_hasta, orden)
-- SELECT empleado, concepto, liquidacion, recibo::INTEGER, descripcion,
--   unidad_manual::NUMERIC, importe_manual::NUMERIC,
--   safe_date(vigencia_desde), safe_date(vigencia_hasta), orden::INTEGER
-- FROM mysql_sld_empleado_concepto;

-- sld_familiar
-- INSERT INTO sld_familiar (empleado, id, parentesco, apellido, nombre, fecha_alta,
--   cuil, sexo, fecha_nacimiento, nacionalidad, tipo_documento, numero_documento,
--   estudio, estado_academico, anio_academico, discapacidad, adopcion, adherente,
--   deducible, porcentaje)
-- SELECT empleado, id, parentesco, apellido, nombre, safe_date(fecha_alta),
--   cuil, sexo, safe_date(fecha_nacimiento), nacionalidad, tipo_documento, numero_documento,
--   estudio, estado_academico, anio_academico::INTEGER, discapacidad, adopcion, adherente,
--   deducible, porcentaje::NUMERIC
-- FROM mysql_sld_familiar;

-- COPY sld_jornada_laboral FROM '...' CSV HEADER ENCODING 'UTF8';
-- COPY sld_horario         FROM '...' CSV HEADER ENCODING 'UTF8';

-- sld_ausentismo (fecha_desde puede ser '0000-00-00')
-- INSERT INTO sld_ausentismo (empleado, motivo, fecha_desde, fecha_hasta, observaciones)
-- SELECT empleado, motivo, safe_date(fecha_desde), safe_date(fecha_hasta), observaciones
-- FROM mysql_sld_ausentismo
-- WHERE safe_date(fecha_desde) IS NOT NULL;

-- COPY sld_presentismo          FROM '...' CSV HEADER ENCODING 'UTF8';
-- COPY sld_novedad              FROM '...' CSV HEADER ENCODING 'UTF8';
-- COPY sld_historial_empleado   FROM '...' CSV HEADER ENCODING 'UTF8';

-- sld_concepto_de_grupo
-- COPY sld_concepto_de_grupo FROM '...' CSV HEADER ENCODING 'UTF8';

-- ─────────────────────────────────────────────────────────────────────────────
-- NIVEL 7 — recibos
-- ─────────────────────────────────────────────────────────────────────────────

-- sld_recibo (mail y visible son bit(1) → BOOLEAN)
-- INSERT INTO sld_recibo (periodo, empleado, numero, periodo_recibo, fecha_recibo,
--   fecha_pago, remunerativo, no_remunerativo, descuento, sueldo_neto, sueldo_bruto,
--   contribucion, costo_laboral, moneda, cotizacion, proyecto, observaciones,
--   mail, visible, orden)
-- SELECT periodo, empleado, numero::INTEGER, periodo_recibo, safe_date(fecha_recibo),
--   safe_date(fecha_pago), remunerativo::NUMERIC, no_remunerativo::NUMERIC,
--   descuento::NUMERIC, sueldo_neto::NUMERIC, sueldo_bruto::NUMERIC,
--   contribucion::NUMERIC, costo_laboral::NUMERIC, moneda, cotizacion::NUMERIC,
--   proyecto, observaciones,
--   (mail = b'\1')::BOOLEAN,   -- bit(1) → BOOLEAN
--   (visible = b'\1')::BOOLEAN,
--   orden::INTEGER
-- FROM mysql_sld_recibo;

-- ─────────────────────────────────────────────────────────────────────────────
-- NIVEL 8 — líneas de recibo
-- ─────────────────────────────────────────────────────────────────────────────

-- sld_recibo_concepto (condicion/warning/error son tinyint(1) → BOOLEAN)
-- INSERT INTO sld_recibo_concepto (periodo, empleado, numero, concepto, descripcion,
--   unidad_manual, importe_manual, unidad, importe, unitario, condicion, warning,
--   error, message, vigencia_desde, vigencia_hasta, orden)
-- SELECT periodo, empleado, numero::INTEGER, concepto, descripcion,
--   unidad_manual::NUMERIC, importe_manual::NUMERIC, unidad::NUMERIC,
--   importe::NUMERIC, unitario::NUMERIC,
--   condicion::BOOLEAN, warning::BOOLEAN, error::BOOLEAN,
--   message, safe_date(vigencia_desde), safe_date(vigencia_hasta), orden::INTEGER
-- FROM mysql_sld_recibo_concepto;

-- sld_recibo_empleado
-- INSERT INTO sld_recibo_empleado (empleado, fecha, tarea, convenio, categoria,
--   sueldo_categoria, adicional_categoria, auxiliar_categoria, sueldo, adicional,
--   auxiliar, dias, horas, porcentaje, jornada, liquidacion, obra_social, sindicato)
-- SELECT empleado, safe_date(fecha), tarea, convenio, categoria,
--   sueldo_categoria::NUMERIC, adicional_categoria::NUMERIC, auxiliar_categoria::NUMERIC,
--   sueldo::NUMERIC, adicional::NUMERIC, auxiliar::NUMERIC,
--   dias::NUMERIC, horas::NUMERIC, porcentaje::NUMERIC,
--   jornada, liquidacion, obra_social, sindicato
-- FROM mysql_sld_recibo_empleado
-- WHERE safe_date(fecha) IS NOT NULL;

-- sld_recibo_afip
-- COPY sld_recibo_afip FROM '...' CSV HEADER ENCODING 'UTF8';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLAS HISTÓRICAS Y PARAMÉTRICAS
-- ─────────────────────────────────────────────────────────────────────────────

-- sld_historial
-- INSERT INTO sld_historial (campo, fecha_desde, fecha_hasta, valor)
-- SELECT campo, safe_date(fecha_desde), safe_date(fecha_hasta), valor
-- FROM mysql_sld_historial WHERE safe_date(fecha_desde) IS NOT NULL;

-- COPY sld_fila          FROM '...' CSV HEADER ENCODING 'UTF8';
-- COPY sld_importacion   FROM '...' CSV HEADER ENCODING 'UTF8';
-- COPY sld_importacion_novedad FROM '...' CSV HEADER ENCODING 'UTF8';

COMMIT;

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- Ejecutar estos SELECT para validar conteos contra la fuente MySQL
-- =============================================================================

SELECT 'bas_moneda'             AS tabla, COUNT(*) AS filas FROM bas_moneda
UNION ALL
SELECT 'sys_empresa',           COUNT(*) FROM sys_empresa
UNION ALL
SELECT 'sld_actividad_laboral', COUNT(*) FROM sld_actividad_laboral
UNION ALL
SELECT 'sld_concepto',          COUNT(*) FROM sld_concepto
UNION ALL
SELECT 'sld_concepto_lsd',      COUNT(*) FROM sld_concepto_lsd
UNION ALL
SELECT 'sld_convenio',          COUNT(*) FROM sld_convenio
UNION ALL
SELECT 'sld_categoria',         COUNT(*) FROM sld_categoria
UNION ALL
SELECT 'sld_empleado',          COUNT(*) FROM sld_empleado
UNION ALL
SELECT 'sld_empleado_afip',     COUNT(*) FROM sld_empleado_afip
UNION ALL
SELECT 'sld_familiar',          COUNT(*) FROM sld_familiar
UNION ALL
SELECT 'sld_liquidacion',       COUNT(*) FROM sld_liquidacion
UNION ALL
SELECT 'sld_recibo',            COUNT(*) FROM sld_recibo
UNION ALL
SELECT 'sld_recibo_concepto',   COUNT(*) FROM sld_recibo_concepto
ORDER BY tabla;

-- =============================================================================
-- HERRAMIENTA ALTERNATIVA: pgloader
-- =============================================================================
-- Si preferís usar pgloader (mucho más simple para migraciones MySQL→PG):
--
-- Instalar: https://pgloader.io/
--
-- Archivo de configuración pgloader (icp_sa.load):
--
-- LOAD DATABASE
--      FROM      mysql://root:password@localhost/icp_sa
--      INTO      postgresql://postgres:password@localhost/sueldos
--
-- WITH include drop, create tables, create indexes,
--      reset sequences, foreign keys,
--      data only
--
-- SET PostgreSQL PARAMETERS
--   client_encoding TO 'UTF-8'
--
-- CAST
--   type tinyint to boolean using tinyint-to-boolean,
--   type bit     to boolean,
--   column sld_empleado.foto to bytea,
--   column sld_empleado.fecha_ingreso   using zero-dates-to-null,
--   column sld_empleado.fecha_egreso    using zero-dates-to-null,
--   column sld_empleado.fecha_nacimiento using zero-dates-to-null
--
-- ONLY TABLE NAMES MATCHING
--   ~/^sld_/, ~/^bas_moneda/, ~/^bas_proyecto/, ~/^sys_empresa/
-- ;
--
-- Ejecutar: pgloader icp_sa.load
-- =============================================================================
