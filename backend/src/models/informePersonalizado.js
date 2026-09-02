const pool = require('../config/db');

// Diseño de Informes Personalizados: reusa sld_informe / sld_informe_campo,
// tablas ya presentes en el esquema migrado del ERP legacy y hasta ahora sin
// uso. "campo" en sld_informe_campo es un correlativo INTEGER por informe
// (no un nombre); el nombre lógico del campo elegido (una clave de
// CAMPOS_DISPONIBLES) se guarda en la columna "formula" existente — acá no
// se evalúan fórmulas propias, solo se usa como referencia al campo real
// (ejecución acotada, ver plan de Informes / memoria de Liquidaciones).

const HEADER_COLS = `
  id, descripcion, tabla, agrupacion, ordenamiento, pesificar, orientation,
  page_size, width, height, left_margin, top_margin, bottom_margin, right_margin,
  condicion, orden
`;
const HEADER_MUTABLE = [
  'descripcion', 'tabla', 'agrupacion', 'ordenamiento', 'pesificar', 'orientation',
  'page_size', 'width', 'height', 'left_margin', 'top_margin', 'bottom_margin', 'right_margin',
  'condicion', 'orden',
];

// Whitelist fija de campos ejecutables por tabla — nunca se interpola texto
// libre del cliente en el SELECT dinámico de ejecutar(), solo estas claves.
const CAMPOS_DISPONIBLES = {
  RECIBO: {
    from: 'sld_recibo r JOIN sld_empleado e ON e.id = r.empleado',
    campos: {
      legajo: { label: 'Legajo', expr: 'e.legajo', tipo: 'TEXT' },
      apellido: { label: 'Apellido', expr: 'e.apellido', tipo: 'TEXT' },
      nombre: { label: 'Nombre', expr: 'e.nombre', tipo: 'TEXT' },
      convenio: { label: 'Convenio', expr: 'e.convenio', tipo: 'TEXT' },
      categoria: { label: 'Categoría', expr: 'e.categoria', tipo: 'TEXT' },
      periodo: { label: 'Período', expr: 'r.periodo', tipo: 'TEXT' },
      fecha_recibo: { label: 'Fecha de Recibo', expr: 'r.fecha_recibo', tipo: 'DATE' },
      remunerativo: { label: 'Remunerativo', expr: 'r.remunerativo', tipo: 'DECIMAL' },
      no_remunerativo: { label: 'No Remunerativo', expr: 'r.no_remunerativo', tipo: 'DECIMAL' },
      descuento: { label: 'Descuento', expr: 'r.descuento', tipo: 'DECIMAL' },
      sueldo_bruto: { label: 'Sueldo Bruto', expr: 'r.sueldo_bruto', tipo: 'DECIMAL' },
      sueldo_neto: { label: 'Sueldo Neto', expr: 'r.sueldo_neto', tipo: 'DECIMAL' },
    },
  },
  RECIBO_CONCEPTO: {
    from: `sld_recibo_concepto rc
           JOIN sld_recibo r ON r.periodo = rc.periodo AND r.empleado = rc.empleado AND r.numero = rc.numero
           JOIN sld_empleado e ON e.id = r.empleado
           JOIN sld_concepto c ON c.id = rc.concepto AND c.empresa = rc.empresa`,
    campos: {
      legajo: { label: 'Legajo', expr: 'e.legajo', tipo: 'TEXT' },
      apellido: { label: 'Apellido', expr: 'e.apellido', tipo: 'TEXT' },
      periodo: { label: 'Período', expr: 'r.periodo', tipo: 'TEXT' },
      concepto: { label: 'Concepto', expr: 'rc.concepto', tipo: 'TEXT' },
      concepto_desc: { label: 'Descripción del Concepto', expr: 'c.descripcion', tipo: 'TEXT' },
      columna: { label: 'Columna', expr: 'c.columna', tipo: 'TEXT' },
      unidad: { label: 'Unidad', expr: 'rc.unidad', tipo: 'DECIMAL' },
      importe: { label: 'Importe', expr: 'rc.importe', tipo: 'DECIMAL' },
    },
  },
  EMPLEADO: {
    from: 'sld_empleado e',
    campos: {
      legajo: { label: 'Legajo', expr: 'e.legajo', tipo: 'TEXT' },
      apellido: { label: 'Apellido', expr: 'e.apellido', tipo: 'TEXT' },
      nombre: { label: 'Nombre', expr: 'e.nombre', tipo: 'TEXT' },
      cuil: { label: 'CUIL', expr: 'e.cuil', tipo: 'TEXT' },
      convenio: { label: 'Convenio', expr: 'e.convenio', tipo: 'TEXT' },
      categoria: { label: 'Categoría', expr: 'e.categoria', tipo: 'TEXT' },
      tarea: { label: 'Tarea', expr: 'e.tarea', tipo: 'TEXT' },
      fecha_ingreso: { label: 'Fecha de Ingreso', expr: 'e.fecha_ingreso', tipo: 'DATE' },
      estado: { label: 'Estado', expr: 'e.estado', tipo: 'TEXT' },
    },
  },
  FAMILIAR: {
    from: 'sld_familiar f JOIN sld_empleado e ON e.id = f.empleado',
    campos: {
      legajo: { label: 'Legajo del Empleado', expr: 'e.legajo', tipo: 'TEXT' },
      parentesco: { label: 'Parentesco', expr: 'f.parentesco', tipo: 'TEXT' },
      apellido: { label: 'Apellido', expr: 'f.apellido', tipo: 'TEXT' },
      nombre: { label: 'Nombre', expr: 'f.nombre', tipo: 'TEXT' },
      cuil: { label: 'CUIL', expr: 'f.cuil', tipo: 'TEXT' },
      fecha_nacimiento: { label: 'Fecha de Nacimiento', expr: 'f.fecha_nacimiento', tipo: 'DATE' },
    },
  },
};

function camposDeTabla(tabla) {
  return CAMPOS_DISPONIBLES[tabla] || null;
}

async function list() {
  const { rows } = await pool.query(`SELECT ${HEADER_COLS} FROM sld_informe ORDER BY orden NULLS LAST, id`);
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query(`SELECT ${HEADER_COLS} FROM sld_informe WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

const toDbValue = v => (v === '' ? null : v);

async function create(data) {
  if (!camposDeTabla(data.tabla)) throw Object.assign(new Error('Tabla inválida'), { status: 400 });
  const cols = HEADER_MUTABLE.filter(c => data[c] !== undefined);
  const vals = [data.id, ...cols.map(c => toDbValue(data[c]))];
  const allCols = ['id', ...cols];
  const ph = allCols.map((_, i) => `$${i + 1}`);
  const { rows } = await pool.query(
    `INSERT INTO sld_informe (${allCols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${HEADER_COLS}`, vals
  );
  return rows[0];
}

async function update(id, data) {
  const cols = HEADER_MUTABLE.filter(c => data[c] !== undefined);
  if (!cols.length) return getById(id);
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = [id, ...cols.map(c => toDbValue(data[c]))];
  const { rows } = await pool.query(
    `UPDATE sld_informe SET ${sets.join(',')} WHERE id = $1 RETURNING ${HEADER_COLS}`, vals
  );
  return rows[0] ?? null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM sld_informe WHERE id = $1', [id]);
  return rowCount > 0;
}

async function listCampos(informe) {
  const { rows } = await pool.query(
    `SELECT informe, campo, tipo, agrupado, visible, descripcion, formula AS campo_clave,
            data_type, length, decimals, campo_format, group_function
     FROM sld_informe_campo WHERE informe = $1 ORDER BY campo`,
    [informe]
  );
  return rows;
}

async function addCampo(informe, data) {
  const cabecera = await getById(informe);
  if (!cabecera) throw Object.assign(new Error('Informe no encontrado'), { status: 404 });
  const tabla = camposDeTabla(cabecera.tabla);
  if (!tabla || !tabla.campos[data.campo_clave]) {
    throw Object.assign(new Error('Campo inválido para la tabla del informe'), { status: 400 });
  }
  const { rows: next } = await pool.query(
    'SELECT COALESCE(MAX(campo), 0) + 1 AS siguiente FROM sld_informe_campo WHERE informe = $1', [informe]
  );
  const campoDef = tabla.campos[data.campo_clave];
  const { rows } = await pool.query(
    `INSERT INTO sld_informe_campo (informe, campo, tipo, agrupado, visible, descripcion, formula, data_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING informe, campo, tipo, agrupado, visible, descripcion, formula AS campo_clave, data_type`,
    [informe, next[0].siguiente, data.tipo || 'FILA', data.agrupado ?? false, data.visible ?? true,
      data.descripcion || campoDef.label, data.campo_clave, campoDef.tipo]
  );
  return rows[0];
}

async function removeCampo(informe, campo) {
  const { rowCount } = await pool.query(
    'DELETE FROM sld_informe_campo WHERE informe = $1 AND campo = $2', [informe, Number(campo)]
  );
  return rowCount > 0;
}

// Ejecución acotada: arma un SELECT solo con expr whitelisted de
// CAMPOS_DISPONIBLES, nunca con texto libre del usuario.
async function ejecutar(informe, filtro = {}) {
  const cabecera = await getById(informe);
  if (!cabecera) throw Object.assign(new Error('Informe no encontrado'), { status: 404 });
  const tablaDef = camposDeTabla(cabecera.tabla);
  const campos = await listCampos(informe);
  const campoDefs = campos
    .map(c => ({ ...c, def: tablaDef?.campos[c.campo_clave] }))
    .filter(c => c.def && c.visible !== false);

  if (!campoDefs.length) return { columnas: [], filas: [] };

  const select = campoDefs.map(c => `${c.def.expr} AS "${c.campo_clave}"`).join(', ');
  const params = [];
  const condiciones = [];
  if (filtro.legajo && tablaDef.from.includes('sld_empleado e')) {
    params.push(`%${filtro.legajo}%`);
    condiciones.push(`e.legajo ILIKE $${params.length}`);
  }
  if (filtro.periodo && /\br\.periodo\b|\brc\.periodo\b/.test(tablaDef.from + select)) {
    params.push(filtro.periodo);
    condiciones.push(`r.periodo = $${params.length}`);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const { rows } = await pool.query(`SELECT ${select} FROM ${tablaDef.from} ${where} LIMIT 500`, params);
  return {
    columnas: campoDefs.map(c => ({ campo: c.campo_clave, descripcion: c.descripcion, tipo: c.data_type })),
    filas: rows,
  };
}

module.exports = {
  CAMPOS_DISPONIBLES, camposDeTabla,
  list, getById, create, update, remove,
  listCampos, addCampo, removeCampo, ejecutar,
};
