const pool = require('../config/db');

const LIQUIDACION_DEFAULT = 'MENSUAL';

async function listIndividualesByEmpleado(empleado) {
  const { rows } = await pool.query(
    `SELECT ec.empleado, ec.concepto, ec.liquidacion, ec.recibo, ec.descripcion,
            ec.unidad_manual, ec.importe_manual, ec.vigencia_desde, ec.vigencia_hasta,
            c.descripcion AS concepto_desc, c.simbolo_unidad
     FROM sld_empleado_concepto ec
     JOIN sld_empleado emp ON emp.id = ec.empleado
     LEFT JOIN sld_concepto c ON c.id = ec.concepto AND c.empresa = emp.empresa
     WHERE ec.empleado = $1
     ORDER BY ec.orden NULLS LAST, ec.concepto`,
    [empleado]
  );
  return rows;
}

async function createIndividual(empleado, data) {
  const { rows } = await pool.query(
    `INSERT INTO sld_empleado_concepto
       (empleado, concepto, liquidacion, recibo, descripcion, unidad_manual, importe_manual, vigencia_desde, vigencia_hasta, empresa)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, (SELECT empresa FROM sld_empleado WHERE id = $1))
     RETURNING empleado, concepto, liquidacion, recibo, descripcion, unidad_manual, importe_manual, vigencia_desde, vigencia_hasta`,
    [
      empleado,
      data.concepto,
      data.liquidacion || LIQUIDACION_DEFAULT,
      data.recibo || 0,
      data.descripcion || null,
      data.unidad_manual === '' ? null : data.unidad_manual ?? null,
      data.importe_manual === '' ? null : data.importe_manual ?? null,
      data.vigencia_desde || null,
      data.vigencia_hasta || null,
    ]
  );
  return rows[0];
}

async function removeIndividual(empleado, concepto, liquidacion, recibo) {
  const { rowCount } = await pool.query(
    `DELETE FROM sld_empleado_concepto
     WHERE empleado = $1 AND concepto = $2 AND liquidacion = $3 AND recibo = $4`,
    [empleado, concepto, liquidacion, recibo]
  );
  return rowCount > 0;
}

async function listGrupales(grupoDeConceptos, empresa) {
  if (!grupoDeConceptos || !empresa) return [];
  const { rows } = await pool.query(
    `SELECT g.grupo_de_conceptos, g.concepto, g.liquidacion, g.recibo, g.descripcion,
            g.unidad_manual, g.importe_manual, g.vigencia_desde, g.vigencia_hasta,
            c.descripcion AS concepto_desc, c.simbolo_unidad
     FROM sld_concepto_de_grupo g
     LEFT JOIN sld_concepto c ON c.id = g.concepto AND c.empresa = g.empresa
     WHERE g.grupo_de_conceptos = $1 AND g.empresa = $2
     ORDER BY g.orden NULLS LAST, g.concepto`,
    [grupoDeConceptos, empresa]
  );
  return rows;
}

async function createGrupal(grupoDeConceptos, empresa, data) {
  const { rows } = await pool.query(
    `INSERT INTO sld_concepto_de_grupo
       (grupo_de_conceptos, concepto, liquidacion, recibo, descripcion, unidad_manual, importe_manual, vigencia_desde, vigencia_hasta, empresa)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING grupo_de_conceptos, concepto, liquidacion, recibo, descripcion, unidad_manual, importe_manual, vigencia_desde, vigencia_hasta`,
    [
      grupoDeConceptos,
      data.concepto,
      data.liquidacion || LIQUIDACION_DEFAULT,
      data.recibo || 0,
      data.descripcion || null,
      data.unidad_manual === '' ? null : data.unidad_manual ?? null,
      data.importe_manual === '' ? null : data.importe_manual ?? null,
      data.vigencia_desde || null,
      data.vigencia_hasta || null,
      empresa,
    ]
  );
  return rows[0];
}

async function removeGrupal(grupoDeConceptos, empresa, concepto, liquidacion, recibo) {
  const { rowCount } = await pool.query(
    `DELETE FROM sld_concepto_de_grupo
     WHERE grupo_de_conceptos = $1 AND empresa = $2 AND concepto = $3 AND liquidacion = $4 AND recibo = $5`,
    [grupoDeConceptos, empresa, concepto, liquidacion, recibo]
  );
  return rowCount > 0;
}

module.exports = {
  listIndividualesByEmpleado, createIndividual, removeIndividual,
  listGrupales, createGrupal, removeGrupal,
};
