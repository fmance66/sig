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

// Cuentas del plan por empresa (todas las empresas, para el panorama global).
async function getCuentasPorEmpresa() {
  const { rows } = await pool.query(
    `SELECT emp.id AS empresa_id, emp.razon_social, count(c.id) AS cuentas
     FROM sys_empresa emp
     LEFT JOIN cnt_cuenta c ON c.empresa = emp.id
     GROUP BY emp.id, emp.razon_social
     ORDER BY emp.razon_social`
  );
  return rows.map(r => ({
    empresaId: r.empresa_id,
    razonSocial: r.razon_social,
    cuentas: Number(r.cuentas),
  }));
}

// Comprobantes de I.V.A. por empresa, todos los períodos (para el panorama global).
async function getComprobantesIvaPorEmpresa() {
  const { rows } = await pool.query(
    `SELECT emp.id AS empresa_id, emp.razon_social, count(cp.empresa) AS comprobantes
     FROM sys_empresa emp
     LEFT JOIN iva_comprobante cp ON cp.empresa = emp.id
     GROUP BY emp.id, emp.razon_social
     ORDER BY emp.razon_social`
  );
  return rows.map(r => ({
    empresaId: r.empresa_id,
    razonSocial: r.razon_social,
    comprobantes: Number(r.comprobantes),
  }));
}

// Panorama del módulo Contabilidad para una empresa: tamaño del plan de cuentas
// (total e imputables), cuentas por naturaleza (para el gráfico), y cantidad de
// ejercicios/centros de costo/leyendas cargados.
async function getResumenContabilidad(empresa) {
  const [cuentas, porNaturaleza, ejercicios, centrosCosto, leyendas] = await Promise.all([
    pool.query(
      `SELECT count(*) AS total, count(*) FILTER (WHERE imputable) AS imputables
       FROM cnt_cuenta WHERE empresa = $1`,
      [empresa]
    ),
    pool.query(
      `SELECT COALESCE(naturaleza, 'Sin clasificar') AS naturaleza, count(*) AS cantidad
       FROM cnt_cuenta WHERE empresa = $1 GROUP BY naturaleza ORDER BY naturaleza`,
      [empresa]
    ),
    pool.query('SELECT count(*) AS total FROM cnt_ejercicio WHERE empresa = $1', [empresa]),
    pool.query('SELECT count(*) AS total FROM cnt_centro_de_costo WHERE empresa = $1', [empresa]),
    pool.query('SELECT count(*) AS total FROM cnt_leyenda WHERE empresa = $1', [empresa]),
  ]);

  return {
    cuentas: {
      total: Number(cuentas.rows[0].total),
      imputables: Number(cuentas.rows[0].imputables),
    },
    cuentasPorNaturaleza: porNaturaleza.rows.map(r => ({ naturaleza: r.naturaleza, cantidad: Number(r.cantidad) })),
    ejercicios: Number(ejercicios.rows[0].total),
    centrosCosto: Number(centrosCosto.rows[0].total),
    leyendas: Number(leyendas.rows[0].total),
  };
}

// Panorama del módulo I.V.A. para una empresa: cantidad de comprobantes y total
// facturado del período actual (por módulo COMPRA/VENTA), y cantidad de proveedores/
// clientes cargados. "Período actual" = el que está en estado ACTIVA en iva_liquidacion
// (o, si no hay ninguno marcado así, el más reciente por fecha_desde) — no hay otro
// indicador de "período en curso" en el esquema de esta fase.
async function getResumenIva(empresa) {
  const { rows: activo } = await pool.query(
    `SELECT periodo FROM iva_liquidacion WHERE empresa = $1 AND estado = 'ACTIVA'
     ORDER BY fecha_desde DESC NULLS LAST LIMIT 1`,
    [empresa]
  );
  let periodoActual = activo[0]?.periodo ?? null;
  if (!periodoActual) {
    const { rows: reciente } = await pool.query(
      `SELECT periodo FROM iva_liquidacion WHERE empresa = $1
       ORDER BY fecha_desde DESC NULLS LAST LIMIT 1`,
      [empresa]
    );
    periodoActual = reciente[0]?.periodo ?? null;
  }

  const [comprobantes, personas] = await Promise.all([
    pool.query(
      `SELECT modulo, count(*) AS cantidad, COALESCE(SUM(total), 0) AS total
       FROM iva_comprobante WHERE empresa = $1 AND periodo = $2 GROUP BY modulo`,
      [empresa, periodoActual]
    ),
    pool.query(
      'SELECT modulo, count(*) AS cantidad FROM iva_persona WHERE empresa = $1 GROUP BY modulo',
      [empresa]
    ),
  ]);

  return {
    periodoActual,
    comprobantesPorModulo: comprobantes.rows.map(r => ({
      modulo: r.modulo, cantidad: Number(r.cantidad), total: Number(r.total) || 0,
    })),
    personasPorModulo: personas.rows.map(r => ({ modulo: r.modulo, cantidad: Number(r.cantidad) })),
  };
}

module.exports = {
  getEmpleadosResumen, getEmpleadosPorConvenio, getMasaSalarialPorPeriodo, getUltimoPeriodo,
  getEmpleadosPorEmpresa, getUltimoPeriodoPorEmpresa, getResumenContabilidad, getResumenIva,
  getCuentasPorEmpresa, getComprobantesIvaPorEmpresa,
};
