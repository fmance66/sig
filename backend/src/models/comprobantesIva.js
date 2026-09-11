const pool = require('../config/db');

// Columnas del header que se pueden setear directo desde el body (POST/PUT). Las columnas
// de totales (subtotal/neto/exento/nogravado/alicuotas/iva/impuesto_1..9/total/recibido)
// quedan afuera a propósito: se recalculan server-side al guardar las líneas de impuesto
// (ver setImpuestos), salvo `alicuotas`/`recibido` que en esta fase no tienen fuente de
// cálculo y quedan sin tocar.
const HEADER_MUTABLE = [
  'fecha', 'periodo', 'servicio_desde', 'servicio_hasta', 'numero_hasta', 'numero_aux',
  'empresa_relacionada', 'empresa_lote', 'moneda', 'cotizacion', 'concepto', 'rubro',
  'provincia', 'condicion_venta', 'prorrateo', 'tipo_adj', 'comprobante_adj', 'anulado',
  'razon_social', 'tipo_documento', 'numero_documento', 'condicion_iva', 'numero_ib',
  'localidad', 'observaciones', 'cae', 'vto_cae', 'orden',
];
const HEADER_NUMERIC = ['cotizacion', 'prorrateo', 'orden', 'empresa_relacionada'];
const HEADER_BOOLEAN = ['anulado'];

// Tipo de impuesto (iva_impuesto.tipo) -> columna del header que acumula ese importe.
// AUXILIAR no suma a ninguna columna de totales.
const COLUMNA_POR_TIPO = {
  NETO: 'neto', EXENTO: 'exento', NO_GRAVADO: 'nogravado', IVA: 'iva',
  IMPUESTO_1: 'impuesto_1', IMPUESTO_2: 'impuesto_2', IMPUESTO_3: 'impuesto_3',
  IMPUESTO_4: 'impuesto_4', IMPUESTO_5: 'impuesto_5', IMPUESTO_6: 'impuesto_6',
  IMPUESTO_7: 'impuesto_7', IMPUESTO_8: 'impuesto_8', IMPUESTO_9: 'impuesto_9',
};
const IMPUESTO_COLS = Object.values(COLUMNA_POR_TIPO);

const HEADER_SELECT = `
  c.modulo, c.tipo, c.comprobante, c.persona, c.empresa, c.fecha, c.periodo,
  c.servicio_desde, c.servicio_hasta, c.numero_hasta, c.numero_aux,
  c.empresa_relacionada, c.empresa_lote, c.moneda, c.cotizacion, c.concepto, c.rubro,
  c.provincia, c.condicion_venta, c.prorrateo, c.tipo_adj, c.comprobante_adj, c.anulado,
  c.razon_social, c.tipo_documento, c.numero_documento, c.condicion_iva, c.numero_ib,
  c.localidad, c.observaciones, c.subtotal, c.neto, c.exento, c.nogravado, c.alicuotas,
  c.iva, c.impuesto_1, c.impuesto_2, c.impuesto_3, c.impuesto_4, c.impuesto_5,
  c.impuesto_6, c.impuesto_7, c.impuesto_8, c.impuesto_9, c.total, c.recibido,
  c.cae, c.vto_cae, c.orden
`;

// Igual que cuentas.js/catalogo.js: no usar `Number(val) || null`, 0 es un valor legítimo.
function normalize(col, val) {
  if (val === '' || val === undefined) return null;
  if (HEADER_BOOLEAN.includes(col)) return val === null ? null : Boolean(val);
  if (HEADER_NUMERIC.includes(col) && val !== null) {
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  }
  return val;
}

async function list({ modulo, empresa, periodo, tipo, persona, fechaDesde, fechaHasta, anulado, texto } = {}) {
  const { rows } = await pool.query(
    `SELECT ${HEADER_SELECT},
            -- pisa c.razon_social (arriba, a menudo NULL o solo espacios — visto en
            -- comprobantes de Consumidor Final de Thompson y French, el legacy solo la
            -- completa si difiere del nombre registrado en iva_persona) con el nombre
            -- real de la persona cuando el header no trae uno propio. TRIM antes de
            -- NULLIF: un valor "todo espacios" no es NULL ni '' así que sin el TRIM
            -- quedaba pisando el nombre real con una cadena en blanco. El frontend lee
            -- row.razon_social tal cual en listado y detalle, así que el nombre de
            -- columna se mantiene.
            COALESCE(NULLIF(TRIM(c.razon_social), ''), p.razon_social) AS razon_social,
            p.numero_documento AS persona_numero_documento,
            tc.descripcion AS tipo_descripcion
     FROM iva_comprobante c
     LEFT JOIN iva_persona p ON p.modulo = c.modulo AND p.id = c.persona AND p.empresa = c.empresa
     LEFT JOIN iva_tipo_comprobante tc ON tc.id = c.tipo AND tc.empresa = c.empresa
     WHERE ($1::text IS NULL OR c.modulo = $1)
       AND ($2::integer IS NULL OR c.empresa = $2)
       AND ($3::text IS NULL OR c.periodo = $3)
       AND ($4::text IS NULL OR c.tipo = $4)
       AND ($5::text IS NULL OR c.persona = $5)
       AND ($6::date IS NULL OR c.fecha >= $6)
       AND ($7::date IS NULL OR c.fecha <= $7)
       AND ($8::boolean IS NULL OR c.anulado = $8)
       AND ($9::text IS NULL OR COALESCE(NULLIF(TRIM(c.razon_social), ''), p.razon_social) ILIKE '%'||$9||'%' OR c.comprobante ILIKE '%'||$9||'%')
     ORDER BY c.fecha DESC NULLS LAST, c.comprobante DESC`,
    [modulo || null, empresa ? Number(empresa) : null, periodo || null, tipo || null, persona || null,
      fechaDesde || null, fechaHasta || null, anulado === undefined || anulado === '' ? null : anulado === 'true' || anulado === true,
      texto || null]
  );
  return rows;
}

async function getHeader(modulo, tipo, comprobante, persona, empresa) {
  const { rows } = await pool.query(
    `SELECT ${HEADER_SELECT},
            COALESCE(NULLIF(TRIM(c.razon_social), ''), p.razon_social) AS razon_social,
            tc.descripcion AS tipo_descripcion
     FROM iva_comprobante c
     LEFT JOIN iva_persona p ON p.modulo = c.modulo AND p.id = c.persona AND p.empresa = c.empresa
     LEFT JOIN iva_tipo_comprobante tc ON tc.id = c.tipo AND tc.empresa = c.empresa
     WHERE c.modulo = $1 AND c.tipo = $2 AND c.comprobante = $3 AND c.persona = $4 AND c.empresa = $5`,
    [modulo, tipo, comprobante, persona, empresa]
  );
  return rows[0] ?? null;
}

async function listImpuestos(modulo, tipo, comprobante, persona, empresa) {
  const { rows } = await pool.query(
    `SELECT ci.id, ci.modulo, ci.tipo, ci.comprobante, ci.persona, ci.impuesto, ci.rubro, ci.empresa,
            ci.alicuota, ci.importe, ci.calculo, ci.imputacion, ci.columna, ci.fila,
            i.nombre AS impuesto_nombre, i.tipo AS impuesto_tipo, r.descripcion AS rubro_descripcion
     FROM iva_comprobante_impuesto ci
     JOIN iva_impuesto i ON i.id = ci.impuesto AND i.empresa = ci.empresa
     LEFT JOIN bas_rubro r ON r.id = ci.rubro AND r.empresa = ci.empresa
     WHERE ci.modulo = $1 AND ci.tipo = $2 AND ci.comprobante = $3 AND ci.persona = $4 AND ci.empresa = $5
     ORDER BY ci.fila NULLS LAST, ci.columna NULLS LAST, ci.id`,
    [modulo, tipo, comprobante, persona, empresa]
  );
  return rows;
}

async function listItems(modulo, tipo, comprobante, persona, empresa) {
  const { rows } = await pool.query(
    `SELECT ci.modulo, ci.tipo, ci.comprobante, ci.persona, ci.item, ci.empresa,
            ci.cantidad, ci.precio, ci.ivainc, ci.importe, ci.alicuota, ci.iva, ci.interno,
            it.descripcion AS item_descripcion, it.unidad
     FROM iva_comprobante_item ci
     JOIN iva_item it ON it.modulo = ci.modulo AND it.id = ci.item AND it.empresa = ci.empresa
     WHERE ci.modulo = $1 AND ci.tipo = $2 AND ci.comprobante = $3 AND ci.persona = $4 AND ci.empresa = $5
     ORDER BY it.orden NULLS LAST, it.id`,
    [modulo, tipo, comprobante, persona, empresa]
  );
  return rows;
}

// Trae header + impuestos + items juntos, para que el modal del frontend arme la
// pantalla completa con un solo fetch.
async function getFull(modulo, tipo, comprobante, persona, empresa) {
  const header = await getHeader(modulo, tipo, comprobante, persona, empresa);
  if (!header) return null;
  const [impuestos, items] = await Promise.all([
    listImpuestos(modulo, tipo, comprobante, persona, empresa),
    listItems(modulo, tipo, comprobante, persona, empresa),
  ]);
  return { ...header, impuestos, items };
}

async function createHeader(data) {
  const extraCols = HEADER_MUTABLE.filter(c => data[c] !== undefined);
  const cols = ['modulo', 'tipo', 'comprobante', 'persona', 'empresa', ...extraCols];
  const vals = [data.modulo, data.tipo, data.comprobante, data.persona, data.empresa,
    ...extraCols.map(c => normalize(c, data[c]))];
  const ph = cols.map((_, i) => `$${i + 1}`);
  await pool.query(
    `INSERT INTO iva_comprobante (${cols.join(',')}) VALUES (${ph.join(',')})`,
    vals
  );
  return getHeader(data.modulo, data.tipo, data.comprobante, data.persona, data.empresa);
}

async function updateHeader(modulo, tipo, comprobante, persona, empresa, data) {
  const cols = HEADER_MUTABLE.filter(c => data[c] !== undefined);
  if (!cols.length) return getHeader(modulo, tipo, comprobante, persona, empresa);
  const sets = cols.map((c, i) => `${c} = $${i + 6}`);
  const vals = [modulo, tipo, comprobante, persona, empresa, ...cols.map(c => normalize(c, data[c]))];
  const { rowCount } = await pool.query(
    `UPDATE iva_comprobante SET ${sets.join(',')}
     WHERE modulo = $1 AND tipo = $2 AND comprobante = $3 AND persona = $4 AND empresa = $5`,
    vals
  );
  if (!rowCount) return null;
  return getHeader(modulo, tipo, comprobante, persona, empresa);
}

async function removeHeader(modulo, tipo, comprobante, persona, empresa) {
  const { rowCount } = await pool.query(
    `DELETE FROM iva_comprobante
     WHERE modulo = $1 AND tipo = $2 AND comprobante = $3 AND persona = $4 AND empresa = $5`,
    [modulo, tipo, comprobante, persona, empresa]
  );
  return rowCount > 0;
}

// Reemplaza todas las líneas de impuesto del comprobante y recalcula los totales del
// header a partir de ellas (subtotal = neto+exento+nogravado, total = subtotal + iva +
// impuesto_1..9). Mismo patrón transaccional que setCentrosCosto en cuentas.js.
async function setImpuestos(modulo, tipo, comprobante, persona, empresa, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM iva_comprobante_impuesto
       WHERE modulo = $1 AND tipo = $2 AND comprobante = $3 AND persona = $4 AND empresa = $5`,
      [modulo, tipo, comprobante, persona, empresa]
    );
    for (const item of items) {
      await client.query(
        `INSERT INTO iva_comprobante_impuesto
           (modulo, tipo, comprobante, persona, impuesto, rubro, empresa, alicuota, importe, calculo, imputacion, columna, fila)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [modulo, tipo, comprobante, persona, item.impuesto, item.rubro || null, empresa,
          item.alicuota === '' || item.alicuota === undefined ? null : Number(item.alicuota),
          item.importe === '' || item.importe === undefined ? null : Number(item.importe),
          item.calculo || null, item.imputacion || null,
          item.columna === '' || item.columna === undefined ? null : Number(item.columna),
          item.fila === '' || item.fila === undefined ? null : Number(item.fila)]
      );
    }

    const { rows: sumas } = await client.query(
      `SELECT i.tipo, SUM(ci.importe) AS total
       FROM iva_comprobante_impuesto ci
       JOIN iva_impuesto i ON i.id = ci.impuesto AND i.empresa = ci.empresa
       WHERE ci.modulo = $1 AND ci.tipo = $2 AND ci.comprobante = $3 AND ci.persona = $4 AND ci.empresa = $5
       GROUP BY i.tipo`,
      [modulo, tipo, comprobante, persona, empresa]
    );

    const totales = {};
    for (const col of IMPUESTO_COLS) totales[col] = 0;
    for (const row of sumas) {
      const col = COLUMNA_POR_TIPO[row.tipo];
      if (col) totales[col] = Number(row.total) || 0;
    }
    const subtotal = totales.neto + totales.exento + totales.nogravado;
    const sumaImpuestos = ['impuesto_1', 'impuesto_2', 'impuesto_3', 'impuesto_4', 'impuesto_5',
      'impuesto_6', 'impuesto_7', 'impuesto_8', 'impuesto_9'].reduce((acc, c) => acc + totales[c], 0);
    const total = subtotal + totales.iva + sumaImpuestos;

    const updCols = ['subtotal', 'neto', 'exento', 'nogravado', 'iva',
      'impuesto_1', 'impuesto_2', 'impuesto_3', 'impuesto_4', 'impuesto_5',
      'impuesto_6', 'impuesto_7', 'impuesto_8', 'impuesto_9', 'total'];
    const updVals = { ...totales, subtotal, total };
    const sets = updCols.map((c, i) => `${c} = $${i + 6}`);
    await client.query(
      `UPDATE iva_comprobante SET ${sets.join(',')}
       WHERE modulo = $1 AND tipo = $2 AND comprobante = $3 AND persona = $4 AND empresa = $5`,
      [modulo, tipo, comprobante, persona, empresa, ...updCols.map(c => updVals[c])]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  const [header, impuestos] = await Promise.all([
    getHeader(modulo, tipo, comprobante, persona, empresa),
    listImpuestos(modulo, tipo, comprobante, persona, empresa),
  ]);
  return { ...header, impuestos };
}

// Reemplaza todos los ítems del comprobante — sin recálculo de header (ver nota en el
// plan: la pestaña de ítems no tiene datos reales migrados, es de bajo uso).
async function setItems(modulo, tipo, comprobante, persona, empresa, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM iva_comprobante_item
       WHERE modulo = $1 AND tipo = $2 AND comprobante = $3 AND persona = $4 AND empresa = $5`,
      [modulo, tipo, comprobante, persona, empresa]
    );
    for (const item of items) {
      await client.query(
        `INSERT INTO iva_comprobante_item
           (modulo, tipo, comprobante, persona, item, empresa, cantidad, precio, ivainc, importe, alicuota, iva, interno)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [modulo, tipo, comprobante, persona, item.item, empresa,
          item.cantidad === '' || item.cantidad === undefined ? null : Number(item.cantidad),
          item.precio === '' || item.precio === undefined ? null : Number(item.precio),
          item.ivainc === undefined ? null : Boolean(item.ivainc),
          item.importe === '' || item.importe === undefined ? null : Number(item.importe),
          item.alicuota === '' || item.alicuota === undefined ? null : Number(item.alicuota),
          item.iva === '' || item.iva === undefined ? null : Number(item.iva),
          item.interno === '' || item.interno === undefined ? null : Number(item.interno)]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return listItems(modulo, tipo, comprobante, persona, empresa);
}

module.exports = {
  list, getHeader, getFull, listImpuestos, listItems,
  createHeader, updateHeader, removeHeader, setImpuestos, setItems,
};
