const pool = require('../config/db');

// Dimensiones disponibles para "Agrupado por" (Conceptos por Grupo,
// Remuneración por Grupos). Whitelist fija: agrupadoPor viaja por querystring
// y se usa para armar SQL, así que nunca se interpola texto libre del cliente.
const DIMENSIONES = {
  proyecto: {
    groupCol: 'e.proyecto',
    descExpr: 'p.descripcion',
    join: 'LEFT JOIN bas_proyecto p ON p.id = e.proyecto',
  },
  convenio: {
    groupCol: 'e.convenio',
    descExpr: 'cv.descripcion',
    join: 'LEFT JOIN sld_convenio cv ON cv.id = e.convenio',
  },
  categoria: {
    groupCol: 'e.categoria',
    descExpr: 'e.categoria',
    join: '',
  },
  grupo: {
    groupCol: 'e.grupo',
    descExpr: 'e.grupo',
    join: '',
  },
  grupoDeConceptos: {
    groupCol: 'e.grupo_de_conceptos',
    descExpr: 'gc.descripcion',
    join: 'LEFT JOIN sld_grupo_de_conceptos gc ON gc.id = e.grupo_de_conceptos',
  },
};

function dimension(agrupadoPor) {
  return DIMENSIONES[agrupadoPor] || DIMENSIONES.proyecto;
}

const num = v => Number(v) || 0;

// Agrupa una lista plana de filas con grupo_id/grupo_desc en { grupos, totales }.
function agruparPorDimension(rows, camposSuma) {
  const grupos = new Map();
  const totales = Object.fromEntries(camposSuma.map(c => [c, 0]));

  for (const row of rows) {
    const key = row.grupo_id ?? '(sin asignar)';
    if (!grupos.has(key)) {
      grupos.set(key, { id: row.grupo_id, descripcion: row.grupo_desc || row.grupo_id || 'Sin asignar', items: [], totales: Object.fromEntries(camposSuma.map(c => [c, 0])) });
    }
    const grupo = grupos.get(key);
    grupo.items.push(row);
    for (const c of camposSuma) {
      grupo.totales[c] += num(row[c]);
      totales[c] += num(row[c]);
    }
  }
  return { grupos: [...grupos.values()], totales };
}

const FILTRO_BASE_SQL = `
  ($1::text IS NULL OR r.periodo = $1)
  AND ($2::text IS NULL OR e.legajo ILIKE '%'||$2||'%')
  AND ($3::text IS NULL OR e.convenio = $3)
  AND ($4::text IS NULL OR e.categoria = $4)
  AND ($5::text IS NULL OR e.grupo = $5)
  AND ($6::text IS NULL OR l.estado = $6)
  AND ($7::integer IS NULL OR e.empresa = $7)
`;

function filtroBaseParams(f) {
  return [f.periodo || null, f.legajo || null, f.convenio || null, f.categoria || null, f.grupo || null, f.estado || null,
    f.empresa ? Number(f.empresa) : null];
}

// ── Conceptos Agrupados ──────────────────────────────────────────────────

async function conceptosAcumulados(filtro = {}) {
  const { rows } = await pool.query(
    `SELECT rc.concepto, c.descripcion AS concepto_desc, c.orden AS concepto_orden,
            SUM(rc.unidad) AS unidad,
            SUM(CASE WHEN c.columna = 'REMUNERATIVO' THEN rc.importe ELSE 0 END) AS remunerativo,
            SUM(CASE WHEN c.columna = 'NO_REMUNERATIVO' THEN rc.importe ELSE 0 END) AS no_remunerativo,
            SUM(CASE WHEN c.columna = 'DESCUENTO' THEN rc.importe ELSE 0 END) AS descuento,
            SUM(CASE WHEN c.columna = 'CONTRIBUCION' THEN rc.importe ELSE 0 END) AS contribucion,
            SUM(CASE WHEN c.columna = 'AUXILIAR' THEN rc.importe ELSE 0 END) AS auxiliar
     FROM sld_recibo_concepto rc
     JOIN sld_recibo r ON r.periodo = rc.periodo AND r.empleado = rc.empleado AND r.numero = rc.numero
     JOIN sld_empleado e ON e.id = r.empleado
     JOIN sld_concepto c ON c.id = rc.concepto AND c.empresa = rc.empresa
     LEFT JOIN sld_liquidacion l ON l.periodo = r.periodo
     WHERE ${FILTRO_BASE_SQL}
     GROUP BY rc.concepto, c.descripcion, c.orden
     ORDER BY c.orden NULLS LAST, rc.concepto`,
    filtroBaseParams(filtro)
  );
  const conceptos = rows.map(r => ({
    ...r,
    sueldo_bruto: num(r.remunerativo) + num(r.no_remunerativo),
    sueldo_neto: num(r.remunerativo) + num(r.no_remunerativo) - num(r.descuento),
  }));
  const camposSuma = ['unidad', 'remunerativo', 'no_remunerativo', 'descuento', 'contribucion', 'auxiliar', 'sueldo_bruto', 'sueldo_neto'];
  const totales = Object.fromEntries(camposSuma.map(c => [c, conceptos.reduce((acc, r) => acc + num(r[c]), 0)]));
  return { conceptos, totales };
}

async function conceptosPorGrupo(filtro = {}) {
  const dim = dimension(filtro.agrupadoPor);
  const { rows } = await pool.query(
    `SELECT ${dim.groupCol} AS grupo_id, ${dim.descExpr} AS grupo_desc,
            rc.concepto, c.descripcion AS concepto_desc, c.orden AS concepto_orden,
            SUM(rc.unidad) AS unidad,
            SUM(CASE WHEN c.columna = 'REMUNERATIVO' THEN rc.importe ELSE 0 END) AS remunerativo,
            SUM(CASE WHEN c.columna = 'NO_REMUNERATIVO' THEN rc.importe ELSE 0 END) AS no_remunerativo,
            SUM(CASE WHEN c.columna = 'DESCUENTO' THEN rc.importe ELSE 0 END) AS descuento
     FROM sld_recibo_concepto rc
     JOIN sld_recibo r ON r.periodo = rc.periodo AND r.empleado = rc.empleado AND r.numero = rc.numero
     JOIN sld_empleado e ON e.id = r.empleado
     JOIN sld_concepto c ON c.id = rc.concepto AND c.empresa = rc.empresa
     LEFT JOIN sld_liquidacion l ON l.periodo = r.periodo
     ${dim.join}
     WHERE ${FILTRO_BASE_SQL}
     GROUP BY ${dim.groupCol}, ${dim.descExpr}, rc.concepto, c.descripcion, c.orden
     ORDER BY ${dim.groupCol} NULLS LAST, c.orden NULLS LAST, rc.concepto`,
    filtroBaseParams(filtro)
  );
  return agruparPorDimension(rows, ['unidad', 'remunerativo', 'no_remunerativo', 'descuento']);
}

async function conceptosPorEmpleado(filtro = {}) {
  const { rows } = await pool.query(
    `SELECT e.id AS empleado, e.legajo, e.apellido, e.nombre,
            ec.concepto, c.descripcion AS concepto_desc, c.columna, ec.vigencia_desde, ec.vigencia_hasta, ec.orden
     FROM sld_empleado_concepto ec
     JOIN sld_empleado e ON e.id = ec.empleado
     LEFT JOIN sld_concepto c ON c.id = ec.concepto AND c.empresa = ec.empresa
     WHERE ($1::text IS NULL OR e.legajo ILIKE '%'||$1||'%')
       AND ($2::text IS NULL OR e.convenio = $2)
       AND ($3::text IS NULL OR e.categoria = $3)
       AND ($4::text IS NULL OR e.grupo = $4)
       AND ($5::text IS NULL OR lower(trim(e.estado)) = lower($5))
       AND ($6::text IS NULL OR ec.concepto ILIKE '%'||$6||'%')
       AND ($7::integer IS NULL OR e.empresa = $7)
     ORDER BY e.apellido NULLS LAST, e.nombre NULLS LAST, ec.orden NULLS LAST, ec.concepto`,
    [filtro.legajo || null, filtro.convenio || null, filtro.categoria || null, filtro.grupo || null,
      filtro.estado || null, filtro.concepto || null, filtro.empresa ? Number(filtro.empresa) : null]
  );

  const empleados = new Map();
  for (const row of rows) {
    if (!empleados.has(row.empleado)) {
      empleados.set(row.empleado, { empleado: row.empleado, legajo: row.legajo, apellido: row.apellido, nombre: row.nombre, conceptos: [] });
    }
    empleados.get(row.empleado).conceptos.push(row);
  }
  return { empleados: [...empleados.values()] };
}

async function conceptosPorRecibo(filtro = {}) {
  const orden = { empleado: 'e.apellido NULLS LAST, e.nombre NULLS LAST, r.periodo', concepto: 'rc.concepto, r.periodo', periodo: 'r.periodo, e.apellido NULLS LAST' }[filtro.orden] || 'e.apellido NULLS LAST, e.nombre NULLS LAST, r.periodo';
  const { rows } = await pool.query(
    `SELECT e.legajo, e.apellido, e.nombre, r.periodo, rc.concepto, c.descripcion AS concepto_desc, rc.unidad, c.columna,
            CASE WHEN c.columna = 'REMUNERATIVO' THEN rc.importe ELSE 0 END AS remunerativo,
            CASE WHEN c.columna = 'NO_REMUNERATIVO' THEN rc.importe ELSE 0 END AS no_remunerativo,
            CASE WHEN c.columna = 'DESCUENTO' THEN rc.importe ELSE 0 END AS descuento
     FROM sld_recibo_concepto rc
     JOIN sld_recibo r ON r.periodo = rc.periodo AND r.empleado = rc.empleado AND r.numero = rc.numero
     JOIN sld_empleado e ON e.id = r.empleado
     JOIN sld_concepto c ON c.id = rc.concepto AND c.empresa = rc.empresa
     LEFT JOIN sld_liquidacion l ON l.periodo = r.periodo
     WHERE ${FILTRO_BASE_SQL}
       AND ($8::text IS NULL OR rc.concepto ILIKE '%'||$8||'%')
     ORDER BY ${orden}`,
    [...filtroBaseParams(filtro), filtro.concepto || null]
  );
  return rows;
}

// ── Remuneración ─────────────────────────────────────────────────────────

async function remuneracionPorConceptos(filtro = {}) {
  const { rows } = await pool.query(
    `SELECT e.id, e.legajo, e.apellido, e.nombre, e.grupo, e.tarea, e.fecha_ingreso, e.fecha_nacimiento, e.orden,
            COALESCE(SUM(r.sueldo_neto), 0) AS sueldo_neto
     FROM sld_empleado e
     LEFT JOIN sld_recibo r ON r.empleado = e.id
       AND ($1::text IS NULL OR r.periodo = $1)
     LEFT JOIN sld_liquidacion l ON l.periodo = r.periodo
     WHERE ($2::text IS NULL OR e.legajo ILIKE '%'||$2||'%')
       AND ($3::text IS NULL OR e.convenio = $3)
       AND ($4::text IS NULL OR e.categoria = $4)
       AND ($5::text IS NULL OR e.grupo = $5)
       AND ($6::text IS NULL OR l.estado = $6)
       AND ($7::text IS NULL OR EXISTS (
             SELECT 1 FROM sld_recibo_concepto rc
             WHERE rc.empleado = e.id AND rc.concepto = $7
               AND ($1::text IS NULL OR rc.periodo = $1)))
       AND ($8::integer IS NULL OR e.empresa = $8)
     GROUP BY e.id, e.legajo, e.apellido, e.nombre, e.grupo, e.tarea, e.fecha_ingreso, e.fecha_nacimiento, e.orden
     ORDER BY e.orden NULLS LAST, e.apellido NULLS LAST, e.nombre NULLS LAST`,
    [filtro.periodo || null, filtro.legajo || null, filtro.convenio || null, filtro.categoria || null,
      filtro.grupo || null, filtro.estado || null, filtro.concepto || null, filtro.empresa ? Number(filtro.empresa) : null]
  );
  const anios = fecha => fecha ? Math.floor((Date.now() - new Date(fecha).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;
  return rows.map(r => ({ ...r, antiguedad: anios(r.fecha_ingreso), edad: anios(r.fecha_nacimiento) }));
}

async function remuneracionPorGrupos(filtro = {}) {
  const dim = dimension(filtro.agrupadoPor);
  const { rows } = await pool.query(
    `SELECT ${dim.groupCol} AS grupo_id, ${dim.descExpr} AS grupo_desc,
            e.legajo, e.apellido, e.nombre, r.periodo, r.fecha_recibo,
            r.remunerativo, r.no_remunerativo, r.descuento, r.sueldo_neto
     FROM sld_recibo r
     JOIN sld_empleado e ON e.id = r.empleado
     LEFT JOIN sld_liquidacion l ON l.periodo = r.periodo
     ${dim.join}
     WHERE ${FILTRO_BASE_SQL}
     ORDER BY ${dim.groupCol} NULLS LAST, e.apellido NULLS LAST, e.nombre NULLS LAST`,
    filtroBaseParams(filtro)
  );
  const resultado = agruparPorDimension(rows, ['remunerativo', 'no_remunerativo', 'descuento', 'sueldo_neto']);
  resultado.grupos.forEach(g => { g.empleados = new Set(g.items.map(i => i.legajo)).size; });
  return resultado;
}

module.exports = {
  DIMENSIONES,
  conceptosAcumulados, conceptosPorGrupo, conceptosPorEmpleado, conceptosPorRecibo,
  remuneracionPorConceptos, remuneracionPorGrupos,
};
