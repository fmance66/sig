const pool = require('../config/db');

const COLS = `
  concepto, aporte_sipa, aporte_inssjyp, aporte_obrasocial, aporte_fsr, aporte_uatre,
  aporte_diferencial, aporte_regespecial, aporte_libre1, aporte_libre2,
  contribucion_sipa, contribucion_inssjyp, contribucion_obrasocial, contribucion_fsr,
  contribucion_renatre, contribucion_aaff, contribucion_fne, contribucion_lrt,
  contribucion_libre1, contribucion_libre2, repetible
`;

const MUTABLE = [
  'aporte_sipa', 'aporte_inssjyp', 'aporte_obrasocial', 'aporte_fsr', 'aporte_uatre',
  'aporte_diferencial', 'aporte_regespecial', 'aporte_libre1', 'aporte_libre2',
  'contribucion_sipa', 'contribucion_inssjyp', 'contribucion_obrasocial', 'contribucion_fsr',
  'contribucion_renatre', 'contribucion_aaff', 'contribucion_fne', 'contribucion_lrt',
  'contribucion_libre1', 'contribucion_libre2', 'repetible',
];

async function getByConcepto(concepto) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM sld_concepto_lsd WHERE concepto = $1`, [concepto]
  );
  return rows[0] ?? null;
}

async function upsert(concepto, data) {
  const cols = MUTABLE.filter(c => data[c] !== undefined);
  const vals = cols.map(c => (data[c] === '' ? null : data[c]));
  const insertCols = ['concepto', ...cols];
  const insertVals = [concepto, ...vals];
  const ph = insertCols.map((_, i) => `$${i + 1}`);
  const updateSet = cols.map(c => `${c} = EXCLUDED.${c}`).join(',');
  const { rows } = await pool.query(
    `INSERT INTO sld_concepto_lsd (${insertCols.join(',')}) VALUES (${ph.join(',')})
     ON CONFLICT (concepto) DO UPDATE SET ${updateSet || 'concepto = EXCLUDED.concepto'}
     RETURNING ${COLS}`,
    insertVals
  );
  return rows[0];
}

module.exports = { getByConcepto, upsert };
