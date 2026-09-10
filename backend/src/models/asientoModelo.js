const pool = require('../config/db');

// Líneas del Asiento Modelo: mismo patrón "reemplazar todo" que
// getCentrosCosto/setCentrosCosto en models/cuentas.js.
async function getLineas(modelo, empresa) {
  const { rows } = await pool.query(
    `SELECT modelo, linea, empresa, cuenta, saldo, leyenda
       FROM cnt_modelo_movimiento
      WHERE modelo = $1 AND empresa = $2
      ORDER BY linea`,
    [modelo, empresa]
  );
  return rows;
}

async function setLineas(modelo, empresa, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM cnt_modelo_movimiento WHERE modelo = $1 AND empresa = $2', [modelo, empresa]);
    let linea = 1;
    for (const item of items) {
      await client.query(
        'INSERT INTO cnt_modelo_movimiento (modelo, linea, empresa, cuenta, saldo, leyenda) VALUES ($1,$2,$3,$4,$5,$6)',
        [modelo, linea, empresa, item.cuenta, item.saldo || null, item.leyenda || null]
      );
      linea += 1;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getLineas(modelo, empresa);
}

module.exports = { getLineas, setLineas };
