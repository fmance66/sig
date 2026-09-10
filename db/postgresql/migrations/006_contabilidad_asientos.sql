-- Módulo Contabilidad — Asientos (partida doble) y Unión de Asientos.
--
-- A diferencia del legacy (que separa `id` interno de `numero` visible/reordenable),
-- acá se unifican en una sola columna `numero`, autoasignada como MAX(numero)+1 por
-- ejercicio+empresa: no hay pantalla de renumeración manual pedida todavía.
-- Tampoco se persisten saldo_debe/saldo_haber en el header (el legacy los cachea);
-- se calculan al vuelo con SUM(debe) sobre cnt_movimiento en el listado.

BEGIN;

CREATE TABLE IF NOT EXISTS cnt_asiento (
    ejercicio       VARCHAR(10) NOT NULL,
    numero          INTEGER     NOT NULL,
    empresa         INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha           DATE        NOT NULL,
    leyenda         VARCHAR(256),
    tipo            VARCHAR(20) CHECK (tipo IN ('APERTURA','OPERATIVO','AJUSTE','REGULARIZACION','CIERRE','MANUAL')),
    moneda          VARCHAR(5)  REFERENCES bas_moneda(id) ON DELETE SET NULL ON UPDATE CASCADE,
    cotizacion      NUMERIC(10,4) DEFAULT 1.0000,
    proyecto        VARCHAR(20) REFERENCES bas_proyecto(id) ON DELETE SET NULL ON UPDATE CASCADE,
    ejercicio_union VARCHAR(10),
    asiento_union   INTEGER,
    PRIMARY KEY (ejercicio, numero, empresa),
    FOREIGN KEY (ejercicio, empresa) REFERENCES cnt_ejercicio(id, empresa) ON DELETE CASCADE ON UPDATE CASCADE,
    -- self-ref para "Unión de Asientos": apunta al asiento "maestro" del grupo.
    -- SET NULL (no CASCADE) por la misma razón que id_padre en cnt_cuenta: borrar
    -- un asiento no debe romper en cascada a los demás miembros de la unión.
    FOREIGN KEY (ejercicio_union, asiento_union, empresa) REFERENCES cnt_asiento(ejercicio, numero, empresa) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS cnt_movimiento (
    ejercicio VARCHAR(10) NOT NULL,
    numero    INTEGER     NOT NULL,
    linea     INTEGER     NOT NULL,
    empresa   INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    cuenta    VARCHAR(20) NOT NULL,
    debe      NUMERIC(17,2) DEFAULT 0,
    haber     NUMERIC(17,2) DEFAULT 0,
    leyenda   VARCHAR(256),
    proyecto  VARCHAR(20) REFERENCES bas_proyecto(id) ON DELETE SET NULL ON UPDATE CASCADE,
    PRIMARY KEY (ejercicio, numero, linea, empresa),
    FOREIGN KEY (ejercicio, numero, empresa) REFERENCES cnt_asiento(ejercicio, numero, empresa) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (cuenta, empresa) REFERENCES cnt_cuenta(id, empresa) ON DELETE CASCADE ON UPDATE CASCADE
);

COMMIT;
