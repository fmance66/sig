-- Asiento Modelo: plantilla reutilizable de cuenta/lado(Debe-Haber)/leyenda para
-- precargar un asiento nuevo. Acotado a propósito: sin el motor de fórmulas por
-- línea que tiene el legacy (cnt_modelo_movimiento.formula) — el usuario completa
-- los importes a mano al generar el asiento real.

BEGIN;

CREATE TABLE IF NOT EXISTS cnt_asiento_modelo (
    id          VARCHAR(20) NOT NULL,
    empresa     INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    descripcion VARCHAR(100),
    leyenda     VARCHAR(256),
    PRIMARY KEY (id, empresa)
);

CREATE TABLE IF NOT EXISTS cnt_modelo_movimiento (
    modelo  VARCHAR(20) NOT NULL,
    linea   INTEGER     NOT NULL,
    empresa INTEGER     NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    cuenta  VARCHAR(20) NOT NULL,
    saldo   VARCHAR(5)  CHECK (saldo IN ('DEBE','HABER')),
    leyenda VARCHAR(256),
    PRIMARY KEY (modelo, linea, empresa),
    FOREIGN KEY (modelo, empresa) REFERENCES cnt_asiento_modelo(id, empresa) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (cuenta, empresa) REFERENCES cnt_cuenta(id, empresa) ON DELETE CASCADE ON UPDATE CASCADE
);

COMMIT;
