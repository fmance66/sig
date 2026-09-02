const pool = require('../config/db');

const LIQUIDACION_DEFAULT = 'MENSUAL';

async function list(empresa) {
  const { rows } = await pool.query(
    `SELECT g.concepto, g.liquidacion, g.recibo, g.descripcion,
            g.unidad_manual, g.importe_manual, g.vigencia_desde, g.vigencia_hasta, g.orden,
            c.descripcion AS concepto_desc, c.simbolo_unidad
     FROM sld_concepto_general g
     LEFT JOIN sld_concepto c ON c.id = g.concepto AND c.empresa = g.empresa
     WHERE g.empresa = $1
     ORDER BY g.orden NULLS LAST, g.concepto`,
    [empresa]
  );
  return rows;
}

async function create(empresa, data) {
  const { rows } = await pool.query(
    `INSERT INTO sld_concepto_general
       (concepto, liquidacion, recibo, descripcion, unidad_manual, importe_manual, vigencia_desde, vigencia_hasta, orden, empresa)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING concepto, liquidacion, recibo, descripcion, unidad_manual, importe_manual, vigencia_desde, vigencia_hasta, orden`,
    [
      data.concepto,
      data.liquidacion || LIQUIDACION_DEFAULT,
      data.recibo || 0,
      data.descripcion || null,
      data.unidad_manual === '' ? null : data.unidad_manual ?? null,
      data.importe_manual === '' ? null : data.importe_manual ?? null,
      data.vigencia_desde || null,
      data.vigencia_hasta || null,
      data.orden === '' ? null : data.orden ?? null,
      empresa,
    ]
  );
  return rows[0];
}

async function remove(empresa, concepto, liquidacion, recibo) {
  const { rowCount } = await pool.query(
    `DELETE FROM sld_concepto_general WHERE empresa = $1 AND concepto = $2 AND liquidacion = $3 AND recibo = $4`,
    [empresa, concepto, liquidacion, recibo]
  );
  return rowCount > 0;
}

module.exports = { list, create, remove };
