-- sld_liquidacion pasa de ser global a tener columna empresa (PK compuesta periodo+empresa),
-- mismo patrón que sld_concepto (id, empresa). Motivo: el sistema legado era una BBDD por
-- empresa; un mismo periodo calendario puede tener metadata distinta (fecha de pago, banco,
-- tipo) por empresa. Ver memoria project_liquidacion_por_empresa_pendiente.

BEGIN;

-- 1) Agregar columnas empresa (nullable por ahora) y sacar las constraints viejas que
--    dependen de que "periodo" solo sea PK/FK, para poder trabajar los datos libremente.
ALTER TABLE sld_liquidacion ADD COLUMN empresa INTEGER REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE sld_recibo ADD COLUMN empresa INTEGER REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE sld_recibo DROP CONSTRAINT sld_recibo_periodo_fkey;
ALTER TABLE sld_liquidacion DROP CONSTRAINT sld_liquidacion_pkey;

-- 2) sld_liquidacion — periodos con recibos de una sola empresa: directo
UPDATE sld_liquidacion l
SET empresa = sub.empresa
FROM (
  SELECT r.periodo, MIN(e.empresa) AS empresa
  FROM sld_recibo r JOIN sld_empleado e ON e.id = r.empleado
  GROUP BY r.periodo
  HAVING COUNT(DISTINCT e.empresa) = 1
) sub
WHERE l.periodo = sub.periodo;

-- 3) sld_liquidacion — periodos con recibos de varias empresas: la fila existente se queda
--    con la empresa de menor id, se duplica (mismos valores de metadata como punto de
--    partida) para cada otra empresa que tenga recibos en ese periodo.
UPDATE sld_liquidacion l
SET empresa = sub.min_empresa
FROM (
  SELECT r.periodo, MIN(e.empresa) AS min_empresa
  FROM sld_recibo r JOIN sld_empleado e ON e.id = r.empleado
  GROUP BY r.periodo
  HAVING COUNT(DISTINCT e.empresa) > 1
) sub
WHERE l.periodo = sub.periodo;

INSERT INTO sld_liquidacion (periodo, tipo, estado, fecha, fecha_desde, fecha_hasta, descripcion,
  concepto_predef, fecha_pago, lugar_pago, fecha_deposito, periodo_deposito, banco_deposito, orden, empresa)
SELECT l.periodo, l.tipo, l.estado, l.fecha, l.fecha_desde, l.fecha_hasta, l.descripcion,
  l.concepto_predef, l.fecha_pago, l.lugar_pago, l.fecha_deposito, l.periodo_deposito, l.banco_deposito, l.orden,
  otras.empresa
FROM sld_liquidacion l
JOIN (
  SELECT DISTINCT r.periodo, e.empresa
  FROM sld_recibo r JOIN sld_empleado e ON e.id = r.empleado
) otras ON otras.periodo = l.periodo AND otras.empresa <> l.empresa
WHERE l.empresa IS NOT NULL;

-- 4) Los 12 periodos huérfanos de 2012 (sin recibos, ni en Postgres ni en los dumps MySQL
--    legacy) existían como filas propias en las bases originales de Minucci Luis Y Minucci
--    Pablo (confirmado grep-eando db/mysql/data/2026-08-28). Se asignan a Luis y se duplican
--    para Pablo, salvo 01/2012 que Pablo no tenía en su base.
UPDATE sld_liquidacion
SET empresa = (SELECT id FROM sys_empresa WHERE razon_social = 'Minucci Luis Alberto')
WHERE periodo IN ('01/2012','02/2012','03/2012','04/2012','05/2012','06/2012 SAC',
                   '07/2012','08/2012','09/2012','10/2012','11/2012','12/2012 SAC')
  AND empresa IS NULL;

INSERT INTO sld_liquidacion (periodo, tipo, estado, fecha, fecha_desde, fecha_hasta, descripcion,
  concepto_predef, fecha_pago, lugar_pago, fecha_deposito, periodo_deposito, banco_deposito, orden, empresa)
SELECT l.periodo, l.tipo, l.estado, l.fecha, l.fecha_desde, l.fecha_hasta, l.descripcion,
  l.concepto_predef, l.fecha_pago, l.lugar_pago, l.fecha_deposito, l.periodo_deposito, l.banco_deposito, l.orden,
  (SELECT id FROM sys_empresa WHERE razon_social = 'Minucci Pablo Daniel')
FROM sld_liquidacion l
WHERE l.periodo IN ('02/2012','03/2012','04/2012','05/2012','06/2012 SAC',
                     '07/2012','08/2012','09/2012','10/2012','11/2012','12/2012 SAC')
  AND l.empresa = (SELECT id FROM sys_empresa WHERE razon_social = 'Minucci Luis Alberto');

-- 5) Verificación: aborta toda la transacción si algo quedó sin asignar en sld_liquidacion
DO $$
DECLARE huerfanos INTEGER;
BEGIN
  SELECT COUNT(*) INTO huerfanos FROM sld_liquidacion WHERE empresa IS NULL;
  IF huerfanos > 0 THEN
    RAISE EXCEPTION 'Quedaron % filas de sld_liquidacion sin empresa asignada', huerfanos;
  END IF;
END $$;

ALTER TABLE sld_liquidacion ALTER COLUMN empresa SET NOT NULL;
ALTER TABLE sld_liquidacion ADD PRIMARY KEY (periodo, empresa);

-- 6) sld_recibo — empresa denormalizada (mismo patrón que sld_recibo_concepto.empresa),
--    backfill desde sld_empleado.
UPDATE sld_recibo r
SET empresa = e.empresa
FROM sld_empleado e
WHERE e.id = r.empleado;

DO $$
DECLARE huerfanos INTEGER;
BEGIN
  SELECT COUNT(*) INTO huerfanos FROM sld_recibo WHERE empresa IS NULL;
  IF huerfanos > 0 THEN
    RAISE EXCEPTION 'Quedaron % filas de sld_recibo sin empresa asignada', huerfanos;
  END IF;
END $$;

ALTER TABLE sld_recibo ALTER COLUMN empresa SET NOT NULL;
ALTER TABLE sld_recibo ADD CONSTRAINT sld_recibo_periodo_empresa_fkey
  FOREIGN KEY (periodo, empresa) REFERENCES sld_liquidacion(periodo, empresa) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
