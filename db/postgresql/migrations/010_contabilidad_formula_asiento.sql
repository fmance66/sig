-- Fórmulas de Asiento: motor de fórmulas de asientos contables, primer uso
-- concreto desde I.V.A. (Compra/Venta/Cobro/Pago — ver Pantallas IVA.docx,
-- menú Exportación → Fórmulas de asiento). No existía ni para Contabilidad
-- en general (ver 007_contabilidad_asiento_modelo.sql, que se acotó a
-- propósito sin motor de fórmulas).
--
-- TRAMPA DE NOMBRES, ojo: el legacy tiene DOS pares de tablas con las mismas
-- palabras invertidas. `cnt_asiento_modelo`/`cnt_modelo_movimiento` (creadas acá
-- en 007) son la plantilla SIMPLE sin fórmulas ("Asientos Modelo" del menú
-- Contabilidad, el usuario completa importes a mano). `cnt_modelo_asiento` (esta
-- migración) es la tabla legacy CON fórmula por línea — coincide de nombre con
-- el legacy 1:1, pero como `cnt_modelo_movimiento` ya está tomado por 007, sus
-- tablas hijas se llaman acá `cnt_formula_movimiento`/`cnt_formula_centro_costo`/
-- `cnt_formula_proyecto` en vez del nombre legacy exacto.
--
-- Motor de evaluación: backend/src/lib/formulaEngineAsiento.js (vocabulario)
-- sobre backend/src/lib/formulaEngine.js (parser genérico, generalizado en esta
-- misma tarea — antes solo conocía el vocabulario de Sueldos).
--
-- Alcance de esta migración: solo la CONFIGURACIÓN de los modelos (CRUD +
-- datos reales de Master). Generar asientos reales a partir de un comprobante
-- ("Contabilizar asientos" del menú Períodos) queda pendiente, sin bloqueo
-- documentado — ver memoria project_iva_gaps_pendientes.
--
-- Datos reales: solo Master tiene modelos con fórmulas reales (8 filas/33
-- líneas en el dump legacy) — Minucci Luis, Minucci Pablo y Zurawski tienen
-- una única plantilla vacía sin líneas ("ASIENTO_I", grupo IVA); ICP y
-- Thompson no tienen ninguna fila. De las 8 filas de Master, `COMPRA_ASIENTO`
-- y `VENTA_ASIENTO` son duplicados exactos (mismas líneas) de `ASIENTO_COMPRA`
-- y `ASIENTO_VENTA` sin ninguna referencia real desde `iva_tipo_comprobante`
-- (que sí referencia a `ASIENTO_COMPRA`/`ASIENTO_VENTA`) — no se migran. Los
-- grupos SUELDOS y DEPOSITO (Cobros/Pagos genéricos, Liquidaciones) quedan
-- fuera de alcance de IVA y tampoco se migran.

BEGIN;

CREATE TABLE IF NOT EXISTS cnt_modelo_asiento (
    id                 VARCHAR(20) NOT NULL,
    empresa            INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    descripcion        VARCHAR(50),
    -- grupo: qué origen dispara este modelo (IVA_COMPRA, IVA_VENTA, COBRO, PAGO).
    grupo              VARCHAR(20),
    -- fecha: nombre de la variable de fecha a usar en el asiento generado (ej. FECHA, FECHA_EJERCICIO) — no es una fórmula a evaluar, es una referencia.
    fecha              VARCHAR(128),
    -- leyenda/condicion: fórmulas del DSL (formulaEngineAsiento) — leyenda concatena texto (ej. PERIODO+" Venta N° "+COMPROBANTE), condicion es boolean.
    leyenda            VARCHAR(256),
    condicion          VARCHAR(256),
    asiento_negativo   VARCHAR(9) CHECK (asiento_negativo IN ('NEGATIVO', 'INVERTIR')) DEFAULT 'NEGATIVO',
    pesificar          BOOLEAN DEFAULT FALSE,
    unir_asientos      BOOLEAN DEFAULT TRUE,
    combinar_cuentas   BOOLEAN DEFAULT TRUE,
    dividir_rubro      BOOLEAN DEFAULT FALSE,
    dividir_proyecto   BOOLEAN DEFAULT FALSE,
    dividir_imputable  BOOLEAN DEFAULT FALSE,
    orden              INTEGER,
    PRIMARY KEY (id, empresa)
);

CREATE TABLE IF NOT EXISTS cnt_formula_movimiento (
    modelo     VARCHAR(20) NOT NULL,
    empresa    INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    movimiento INTEGER     NOT NULL,
    cuenta     VARCHAR(20) NOT NULL,
    saldo      VARCHAR(5)  CHECK (saldo IN ('DEBE', 'HABER')),
    -- formula: fórmula del DSL que calcula el importe de la línea (ej. IVA_TOTAL, IMPUESTOS(IIBB), IF(RUBRO=?,...,0)).
    formula    VARCHAR(1024),
    leyenda    VARCHAR(256),
    PRIMARY KEY (modelo, empresa, movimiento),
    FOREIGN KEY (modelo, empresa) REFERENCES cnt_modelo_asiento(id, empresa) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (cuenta, empresa) REFERENCES cnt_cuenta(id, empresa)        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Prorrateo de una línea de fórmula entre centros de costo. 0 filas reales en
-- los 6 dumps legacy (tab "Centros de costo" nunca se usó) — se construye
-- igual porque es parte inherente de esta misma feature (a diferencia de
-- Certificado de Retención, que es una feature aparte sin ningún dato real).
CREATE TABLE IF NOT EXISTS cnt_formula_centro_costo (
    modelo          VARCHAR(20) NOT NULL,
    empresa         INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    movimiento      INTEGER     NOT NULL,
    centro_de_costo VARCHAR(20) NOT NULL,
    -- porcentaje: fórmula del DSL (no un número fijo) — el legacy lo declara varchar(512).
    porcentaje      VARCHAR(512),
    PRIMARY KEY (modelo, empresa, movimiento, centro_de_costo),
    FOREIGN KEY (modelo, empresa, movimiento) REFERENCES cnt_formula_movimiento(modelo, empresa, movimiento) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (centro_de_costo, empresa)    REFERENCES cnt_centro_de_costo(id, empresa)                    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Condición (por modelo, no por línea) para incluir un proyecto en el asiento.
-- 0 filas reales, mismo motivo que cnt_formula_centro_costo.
CREATE TABLE IF NOT EXISTS cnt_formula_proyecto (
    modelo    VARCHAR(20) NOT NULL,
    empresa   INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    proyecto  VARCHAR(20) NOT NULL REFERENCES bas_proyecto(id) ON DELETE CASCADE ON UPDATE CASCADE,
    condicion VARCHAR(512),
    PRIMARY KEY (modelo, empresa, proyecto),
    FOREIGN KEY (modelo, empresa) REFERENCES cnt_modelo_asiento(id, empresa) ON DELETE CASCADE ON UPDATE CASCADE
);

COMMIT;
