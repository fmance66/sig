-- Link comprobante -> asiento generado, para "Contabilizar asientos"/"Recalcular
-- comprobantes" (menú Períodos de I.V.A., pendiente documentado en
-- 010_contabilidad_formula_asiento.sql — ver memoria
-- project_motor_formulas_asiento_contabilidad).
--
-- Los 4 modelos reales migrados (ASIENTO_COMPRA/VENTA/COBRO/PAGO) tienen
-- unir_asientos=true: se genera UN solo asiento por (período+modelo) que agrupa
-- todos los comprobantes candidatos, no uno por comprobante. Por eso alcanza con
-- guardar el link en el propio comprobante (muchos comprobantes -> mismo asiento),
-- sin necesitar una tabla puente.

BEGIN;

ALTER TABLE iva_comprobante
    ADD COLUMN asiento_ejercicio VARCHAR(10),
    ADD COLUMN asiento_numero INTEGER;

-- ON DELETE RESTRICT (no SET NULL): con una FK compuesta que incluye `empresa`,
-- un SET NULL pondría en NULL las 3 columnas —incluida `empresa`, NOT NULL por
-- ser parte de la PK de iva_comprobante— y rompería con violación de constraint.
-- El código de "Recalcular comprobantes" (contabilizarIva.js) desvincula a mano
-- (UPDATE ... SET asiento_ejercicio=NULL, asiento_numero=NULL) antes de borrar
-- el asiento viejo.
ALTER TABLE iva_comprobante
    ADD CONSTRAINT iva_comprobante_asiento_fkey
    FOREIGN KEY (asiento_ejercicio, asiento_numero, empresa)
    REFERENCES cnt_asiento (ejercicio, numero, empresa)
    ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
