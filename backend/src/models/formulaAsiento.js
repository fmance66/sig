const pool = require('../config/db');

// Sub-recursos de un modelo de cnt_modelo_asiento: mismo patrón "reemplazar
// todo" que getLineas/setLineas de models/asientoModelo.js.

async function getMovimientos(modelo, empresa) {
  const { rows } = await pool.query(
    `SELECT modelo, movimiento, empresa, cuenta, saldo, formula, leyenda
       FROM cnt_formula_movimiento
      WHERE modelo = $1 AND empresa = $2
      ORDER BY movimiento`,
    [modelo, empresa]
  );
  return rows;
}

async function setMovimientos(modelo, empresa, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // CASCADE se lleva puestas las filas de cnt_formula_centro_costo de los
    // movimientos borrados acá — el frontend siempre guarda movimientos y
    // centros de costo juntos en el mismo Guardar, en ese orden.
    await client.query('DELETE FROM cnt_formula_movimiento WHERE modelo = $1 AND empresa = $2', [modelo, empresa]);
    for (const item of items) {
      await client.query(
        `INSERT INTO cnt_formula_movimiento (modelo, movimiento, empresa, cuenta, saldo, formula, leyenda)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [modelo, item.movimiento, empresa, item.cuenta, item.saldo || null, item.formula || null, item.leyenda || null]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getMovimientos(modelo, empresa);
}

async function getCentrosCosto(modelo, empresa) {
  const { rows } = await pool.query(
    `SELECT modelo, movimiento, empresa, centro_de_costo, porcentaje
       FROM cnt_formula_centro_costo
      WHERE modelo = $1 AND empresa = $2
      ORDER BY movimiento, centro_de_costo`,
    [modelo, empresa]
  );
  return rows;
}

async function setCentrosCosto(modelo, empresa, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM cnt_formula_centro_costo WHERE modelo = $1 AND empresa = $2', [modelo, empresa]);
    for (const item of items) {
      await client.query(
        `INSERT INTO cnt_formula_centro_costo (modelo, movimiento, empresa, centro_de_costo, porcentaje)
         VALUES ($1,$2,$3,$4,$5)`,
        [modelo, item.movimiento, empresa, item.centro_de_costo, item.porcentaje || null]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getCentrosCosto(modelo, empresa);
}

async function getProyectos(modelo, empresa) {
  const { rows } = await pool.query(
    `SELECT modelo, empresa, proyecto, condicion
       FROM cnt_formula_proyecto
      WHERE modelo = $1 AND empresa = $2
      ORDER BY proyecto`,
    [modelo, empresa]
  );
  return rows;
}

async function setProyectos(modelo, empresa, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM cnt_formula_proyecto WHERE modelo = $1 AND empresa = $2', [modelo, empresa]);
    for (const item of items) {
      await client.query(
        `INSERT INTO cnt_formula_proyecto (modelo, empresa, proyecto, condicion)
         VALUES ($1,$2,$3,$4)`,
        [modelo, empresa, item.proyecto, item.condicion || null]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getProyectos(modelo, empresa);
}

module.exports = {
  getMovimientos, setMovimientos,
  getCentrosCosto, setCentrosCosto,
  getProyectos, setProyectos,
};
