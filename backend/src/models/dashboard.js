const pool = require('../config/db');

async function getEmpleadosResumen(empresa) {
  const { rows } = await pool.query(
    `SELECT
       count(*) FILTER (WHERE lower(trim(estado)) = 'activo') AS activos,
       count(*) FILTER (WHERE lower(trim(estado)) IS DISTINCT FROM 'activo') AS inactivos
     FROM sld_empleado
     WHERE empresa = $1`,
    [empresa]
  );
  const r = rows[0];
  return { activos: Number(r.activos), inactivos: Number(r.inactivos) };
}

async function getEmpleadosPorConvenio(empresa) {
  const { rows } = await pool.query(
    `SELECT COALESCE(cv.descripcion, 'Sin convenio') AS convenio, count(*) AS cantidad
     FROM sld_empleado e
     LEFT JOIN sld_convenio cv ON cv.id = e.convenio
     WHERE e.empresa = $1 AND lower(trim(e.estado)) = 'activo'
     GROUP BY cv.descripcion
     ORDER BY cantidad DESC`,
    [empresa]
  );
  return rows.map(r => ({ convenio: r.convenio, cantidad: Number(r.cantidad) }));
}

// `periodo` es texto libre (ej. "MM/AAAA" o "1ra Quinc. MM/AAAA"), no es
// ordenable como string — se ordena por sld_liquidacion.fecha, igual que
// PeriodoSelect (ver components/PeriodoSelect.jsx).
async function getMasaSalarialPorPeriodo(empresa, limit = 6) {
  const { rows } = await pool.query(
    `SELECT r.periodo, SUM(r.sueldo_bruto) AS bruto, SUM(r.sueldo_neto) AS neto, COUNT(*) AS recibos,
            MAX(l.fecha) AS fecha
     FROM sld_recibo r
     JOIN sld_empleado e ON e.id = r.empleado
     LEFT JOIN sld_liquidacion l ON l.periodo = r.periodo AND l.empresa = r.empresa
     WHERE e.empresa = $1
     GROUP BY r.periodo
     ORDER BY MAX(l.fecha) DESC NULLS LAST
     LIMIT $2`,
    [empresa, limit]
  );
  return rows.reverse().map(r => ({
    periodo: r.periodo,
    bruto: Number(r.bruto) || 0,
    neto: Number(r.neto) || 0,
    recibos: Number(r.recibos),
  }));
}

async function getUltimoPeriodo(empresa) {
  const { rows } = await pool.query(
    `SELECT r.periodo, COUNT(*) AS recibos, SUM(r.sueldo_neto) AS neto,
            l.estado, l.descripcion, l.fecha_pago
     FROM sld_recibo r
     JOIN sld_empleado e ON e.id = r.empleado
     LEFT JOIN sld_liquidacion l ON l.periodo = r.periodo AND l.empresa = r.empresa
     WHERE e.empresa = $1
     GROUP BY r.periodo, l.estado, l.descripcion, l.fecha_pago, l.fecha
     ORDER BY l.fecha DESC NULLS LAST
     LIMIT 1`,
    [empresa]
  );
  if (!rows.length) return null;
  const { periodo, recibos, neto, estado, descripcion, fecha_pago } = rows[0];
  return { periodo, recibos: Number(recibos), neto: Number(neto) || 0, estado, descripcion, fecha_pago };
}

async function getEmpleadosPorEmpresa() {
  const { rows } = await pool.query(
    `SELECT emp.id AS empresa_id, emp.razon_social,
            count(*) FILTER (WHERE lower(trim(e.estado)) = 'activo') AS activos,
            count(*) FILTER (WHERE lower(trim(e.estado)) IS DISTINCT FROM 'activo') AS inactivos
     FROM sys_empresa emp
     LEFT JOIN sld_empleado e ON e.empresa = emp.id
     GROUP BY emp.id, emp.razon_social
     ORDER BY emp.razon_social`
  );
  return rows.map(r => ({
    empresaId: r.empresa_id,
    razonSocial: r.razon_social,
    activos: Number(r.activos),
    inactivos: Number(r.inactivos),
  }));
}

// Último período liquidado de cada empresa (por fecha de sld_liquidacion), con
// su masa salarial neta — misma lógica que getUltimoPeriodo pero para todas
// las empresas en una sola consulta.
async function getUltimoPeriodoPorEmpresa() {
  const { rows } = await pool.query(
    `WITH ultimos AS (
       SELECT DISTINCT ON (e.empresa) e.empresa AS empresa_id, r.periodo
       FROM sld_recibo r
       JOIN sld_empleado e ON e.id = r.empleado
       LEFT JOIN sld_liquidacion l ON l.periodo = r.periodo AND l.empresa = r.empresa
       ORDER BY e.empresa, l.fecha DESC NULLS LAST
     )
     SELECT emp.id AS empresa_id, emp.razon_social, u.periodo,
            SUM(r.sueldo_neto) AS neto, COUNT(*) AS recibos
     FROM ultimos u
     JOIN sys_empresa emp ON emp.id = u.empresa_id
     JOIN sld_empleado e2 ON e2.empresa = u.empresa_id
     JOIN sld_recibo r ON r.periodo = u.periodo AND r.empleado = e2.id
     GROUP BY emp.id, emp.razon_social, u.periodo
     ORDER BY emp.razon_social`
  );
  return rows.map(r => ({
    empresaId: r.empresa_id,
    razonSocial: r.razon_social,
    periodo: r.periodo,
    neto: Number(r.neto) || 0,
    recibos: Number(r.recibos),
  }));
}

module.exports = {
  getEmpleadosResumen, getEmpleadosPorConvenio, getMasaSalarialPorPeriodo, getUltimoPeriodo,
  getEmpleadosPorEmpresa, getUltimoPeriodoPorEmpresa,
};
