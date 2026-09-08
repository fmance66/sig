const pool = require('../config/db');

async function getByPeriodo(periodo) {
  const { rows } = await pool.query(
    `SELECT periodo, minimo, maximo, origen, fuente, actualizado FROM sld_tope_previsional WHERE periodo = $1`,
    [periodo]
  );
  return rows[0] ?? null;
}

async function upsert(periodo, { minimo, maximo, origen, fuente }) {
  const { rows } = await pool.query(
    `INSERT INTO sld_tope_previsional (periodo, minimo, maximo, origen, fuente, actualizado)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (periodo) DO UPDATE SET minimo = EXCLUDED.minimo, maximo = EXCLUDED.maximo,
       origen = EXCLUDED.origen, fuente = EXCLUDED.fuente, actualizado = NOW()
     RETURNING periodo, minimo, maximo, origen, fuente, actualizado`,
    [periodo, minimo, maximo, origen === 'MANUAL' ? 'MANUAL' : 'SCRAPE', fuente ?? null]
  );
  return rows[0];
}

module.exports = { getByPeriodo, upsert };
