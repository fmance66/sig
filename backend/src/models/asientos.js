const pool = require('../config/db');

const HEADER_COLS = 'ejercicio, numero, empresa, fecha, leyenda, tipo, moneda, cotizacion, proyecto, ejercicio_union, asiento_union';

function normalizeMonto(val) {
  if (val === '' || val === undefined || val === null) return 0;
  const n = Number(val);
  return Number.isNaN(n) ? 0 : n;
}

// Trae los headers de un ejercicio con el saldo (SUM(debe)) calculado al vuelo —
// no se persiste en cnt_asiento para no arrastrar el bug de caches desincronizados
// que ya se vio antes en el proyecto (ver normalize() 0->null en otros modelos).
async function list(ejercicio, empresa, { cuenta, leyenda, tipo } = {}) {
  const params = [ejercicio, empresa];
  const filtros = [];
  if (cuenta) {
    params.push(`%${cuenta}%`);
    filtros.push(`EXISTS (SELECT 1 FROM cnt_movimiento m2 WHERE m2.ejercicio = a.ejercicio AND m2.numero = a.numero AND m2.empresa = a.empresa AND m2.cuenta ILIKE $${params.length})`);
  }
  if (leyenda) {
    params.push(`%${leyenda}%`);
    const idx = params.length;
    filtros.push(`(a.leyenda ILIKE $${idx} OR EXISTS (SELECT 1 FROM cnt_movimiento m3 WHERE m3.ejercicio = a.ejercicio AND m3.numero = a.numero AND m3.empresa = a.empresa AND m3.leyenda ILIKE $${idx}))`);
  }
  if (tipo) {
    params.push(tipo);
    filtros.push(`a.tipo = $${params.length}`);
  }
  const where = ['a.ejercicio = $1', 'a.empresa = $2', ...filtros].join(' AND ');
  const { rows } = await pool.query(
    `SELECT a.ejercicio, a.numero, a.empresa, a.fecha, a.leyenda, a.tipo, a.moneda, a.cotizacion, a.proyecto,
            a.ejercicio_union, a.asiento_union, COALESCE(SUM(m.debe), 0) AS saldo
       FROM cnt_asiento a
       LEFT JOIN cnt_movimiento m ON m.ejercicio = a.ejercicio AND m.numero = a.numero AND m.empresa = a.empresa
      WHERE ${where}
      GROUP BY a.ejercicio, a.numero, a.empresa
      ORDER BY a.numero`,
    params
  );
  return rows;
}

// Solo diagnóstico: con validarBalance() en create/update esto no debería poder
// pasar nunca desde la app, pero sirve de red de seguridad ante datos importados.
async function listDesbalanceados(ejercicio, empresa) {
  const { rows } = await pool.query(
    `SELECT a.ejercicio, a.numero, a.empresa, a.fecha, a.leyenda,
            COALESCE(SUM(m.debe), 0) AS debe, COALESCE(SUM(m.haber), 0) AS haber
       FROM cnt_asiento a
       LEFT JOIN cnt_movimiento m ON m.ejercicio = a.ejercicio AND m.numero = a.numero AND m.empresa = a.empresa
      WHERE a.ejercicio = $1 AND a.empresa = $2
      GROUP BY a.ejercicio, a.numero, a.empresa
     HAVING ROUND(COALESCE(SUM(m.debe), 0) - COALESCE(SUM(m.haber), 0), 2) <> 0
      ORDER BY a.numero`,
    [ejercicio, empresa]
  );
  return rows;
}

async function getMovimientos(ejercicio, numero, empresa) {
  const { rows } = await pool.query(
    `SELECT m.ejercicio, m.numero, m.linea, m.empresa, m.cuenta, m.debe, m.haber, m.leyenda, m.proyecto,
            c.descripcion AS cuenta_descripcion
       FROM cnt_movimiento m
       JOIN cnt_cuenta c ON c.id = m.cuenta AND c.empresa = m.empresa
      WHERE m.ejercicio = $1 AND m.numero = $2 AND m.empresa = $3
      ORDER BY m.linea`,
    [ejercicio, numero, empresa]
  );
  return rows;
}

function validarBalance(movimientos) {
  if (!Array.isArray(movimientos) || movimientos.length < 2) {
    return 'El asiento debe tener al menos 2 líneas';
  }
  let totalDebe = 0, totalHaber = 0;
  for (const m of movimientos) {
    if (!m.cuenta) return 'Todas las líneas requieren una cuenta';
    totalDebe += normalizeMonto(m.debe);
    totalHaber += normalizeMonto(m.haber);
  }
  if (Math.round((totalDebe - totalHaber) * 100) !== 0) {
    return 'El asiento no está balanceado: Debe y Haber deben ser iguales';
  }
  if (totalDebe === 0) return 'El asiento no puede tener un total en cero';
  return null;
}

async function getHeader(client, ejercicio, numero, empresa) {
  const { rows } = await client.query(`SELECT ${HEADER_COLS} FROM cnt_asiento WHERE ejercicio = $1 AND numero = $2 AND empresa = $3`, [ejercicio, numero, empresa]);
  return rows[0] ?? null;
}

async function insertarMovimientos(client, ejercicio, numero, empresa, movimientos) {
  let linea = 1;
  for (const m of movimientos) {
    await client.query(
      `INSERT INTO cnt_movimiento (ejercicio, numero, linea, empresa, cuenta, debe, haber, leyenda, proyecto)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [ejercicio, numero, linea, empresa, m.cuenta, normalizeMonto(m.debe), normalizeMonto(m.haber), m.leyenda || null, m.proyecto || null]
    );
    linea += 1;
  }
}

async function create(data) {
  const error = validarBalance(data.movimientos);
  if (error) { const e = new Error(error); e.status = 400; throw e; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock sobre la fila del ejercicio para serializar el cálculo de `numero`
    // entre altas concurrentes del mismo ejercicio+empresa.
    await client.query('SELECT id FROM cnt_ejercicio WHERE id = $1 AND empresa = $2 FOR UPDATE', [data.ejercicio, data.empresa]);
    const { rows } = await client.query(
      'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM cnt_asiento WHERE ejercicio = $1 AND empresa = $2',
      [data.ejercicio, data.empresa]
    );
    const numero = rows[0].siguiente;
    await client.query(
      `INSERT INTO cnt_asiento (ejercicio, numero, empresa, fecha, leyenda, tipo, moneda, cotizacion, proyecto)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [data.ejercicio, numero, data.empresa, data.fecha, data.leyenda || null, data.tipo || null,
       data.moneda || null, data.cotizacion || 1, data.proyecto || null]
    );
    await insertarMovimientos(client, data.ejercicio, numero, data.empresa, data.movimientos);
    await client.query('COMMIT');
    return getHeader(pool, data.ejercicio, numero, data.empresa);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function update(ejercicio, numero, empresa, data) {
  const error = validarBalance(data.movimientos);
  if (error) { const e = new Error(error); e.status = 400; throw e; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `UPDATE cnt_asiento SET fecha = $4, leyenda = $5, tipo = $6, moneda = $7, cotizacion = $8, proyecto = $9
        WHERE ejercicio = $1 AND numero = $2 AND empresa = $3`,
      [ejercicio, numero, empresa, data.fecha, data.leyenda || null, data.tipo || null,
       data.moneda || null, data.cotizacion || 1, data.proyecto || null]
    );
    if (!rowCount) { await client.query('ROLLBACK'); return null; }
    await client.query('DELETE FROM cnt_movimiento WHERE ejercicio = $1 AND numero = $2 AND empresa = $3', [ejercicio, numero, empresa]);
    await insertarMovimientos(client, ejercicio, numero, empresa, data.movimientos);
    await client.query('COMMIT');
    return getHeader(pool, ejercicio, numero, empresa);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function remove(ejercicio, numero, empresa) {
  const { rowCount } = await pool.query(
    'DELETE FROM cnt_asiento WHERE ejercicio = $1 AND numero = $2 AND empresa = $3',
    [ejercicio, numero, empresa]
  );
  return rowCount > 0;
}

// "Unión de Asientos": agrupa varios asientos bajo el de menor número (maestro) y,
// opcionalmente, pisa fecha/leyenda en todos los seleccionados (y en sus líneas si
// unirLeyendas viene en true).
async function union({ ejercicio, empresa, numeros, fecha, leyenda, unirLeyendas }) {
  if (!Array.isArray(numeros) || numeros.length < 2) {
    const e = new Error('Elegí al menos 2 asientos para unir'); e.status = 400; throw e;
  }
  const master = Math.min(...numeros);
  const hijos = numeros.filter(n => n !== master);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (hijos.length) {
      await client.query(
        `UPDATE cnt_asiento SET ejercicio_union = $1, asiento_union = $2
          WHERE ejercicio = $1 AND numero = ANY($3::int[]) AND empresa = $4`,
        [ejercicio, master, hijos, empresa]
      );
    }
    if (fecha) {
      await client.query(
        `UPDATE cnt_asiento SET fecha = $1 WHERE ejercicio = $2 AND numero = ANY($3::int[]) AND empresa = $4`,
        [fecha, ejercicio, numeros, empresa]
      );
    }
    if (leyenda) {
      await client.query(
        `UPDATE cnt_asiento SET leyenda = $1 WHERE ejercicio = $2 AND numero = ANY($3::int[]) AND empresa = $4`,
        [leyenda, ejercicio, numeros, empresa]
      );
      if (unirLeyendas) {
        await client.query(
          `UPDATE cnt_movimiento SET leyenda = $1 WHERE ejercicio = $2 AND numero = ANY($3::int[]) AND empresa = $4`,
          [leyenda, ejercicio, numeros, empresa]
        );
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return { master, numeros };
}

// Reordena `numero` de todos los asientos de un ejercicio+empresa según `orden`
// ('fecha' o 'numero'), empezando en `numeroInicial` con paso `incremento`.
// Se hace en 2 fases para no chocar contra la PK (ejercicio,numero,empresa) al
// reasignar: primero se corren todos a un rango alto fuera de uso, después se
// asignan los valores finales uno por uno. ON UPDATE CASCADE en las FK de
// cnt_movimiento y en la auto-referencia ejercicio_union/asiento_union hace que
// este UPDATE de la PK arrastre todo lo demás sin tocarlo a mano.
const OFFSET_TEMPORAL = 1000000;

async function renumerar({ ejercicio, empresa, numeroInicial, incremento, orden }) {
  const inicial = Number(numeroInicial) || 1;
  const paso = Number(incremento) || 1;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM cnt_ejercicio WHERE id = $1 AND empresa = $2 FOR UPDATE', [ejercicio, empresa]);
    const ordenCol = orden === 'fecha' ? 'fecha' : 'numero';
    const { rows } = await client.query(
      `SELECT numero FROM cnt_asiento WHERE ejercicio = $1 AND empresa = $2 ORDER BY ${ordenCol}, numero`,
      [ejercicio, empresa]
    );
    await client.query(
      `UPDATE cnt_asiento SET numero = numero + $3 WHERE ejercicio = $1 AND empresa = $2`,
      [ejercicio, empresa, OFFSET_TEMPORAL]
    );
    let numero = inicial;
    for (const row of rows) {
      await client.query(
        `UPDATE cnt_asiento SET numero = $1 WHERE ejercicio = $2 AND numero = $3 AND empresa = $4`,
        [numero, ejercicio, row.numero + OFFSET_TEMPORAL, empresa]
      );
      numero += paso;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return list(ejercicio, empresa, {});
}

module.exports = { list, listDesbalanceados, getMovimientos, create, update, remove, union, renumerar };
