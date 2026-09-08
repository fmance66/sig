const pool = require('../config/db');

const COLS = `
  concepto, aporte_sipa, aporte_inssjyp, aporte_obrasocial, aporte_fsr, aporte_uatre,
  aporte_diferencial, aporte_regespecial, aporte_renatre, aporte_libre1, aporte_libre2,
  contribucion_sipa, contribucion_inssjyp, contribucion_obrasocial, contribucion_fsr,
  contribucion_renatre, contribucion_aaff, contribucion_fne, contribucion_lrt,
  contribucion_libre1, contribucion_libre2, repetible
`;

const MUTABLE = [
  'aporte_sipa', 'aporte_inssjyp', 'aporte_obrasocial', 'aporte_fsr', 'aporte_uatre',
  'aporte_diferencial', 'aporte_regespecial', 'aporte_renatre', 'aporte_libre1', 'aporte_libre2',
  'contribucion_sipa', 'contribucion_inssjyp', 'contribucion_obrasocial', 'contribucion_fsr',
  'contribucion_renatre', 'contribucion_aaff', 'contribucion_fne', 'contribucion_lrt',
  'contribucion_libre1', 'contribucion_libre2', 'repetible',
];

async function getByConcepto(concepto, empresa) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM sld_concepto_lsd WHERE concepto = $1 AND empresa = $2`, [concepto, empresa]
  );
  return rows[0] ?? null;
}

async function upsert(concepto, empresa, data) {
  const cols = MUTABLE.filter(c => data[c] !== undefined);
  const vals = cols.map(c => (data[c] === '' ? null : data[c]));
  const insertCols = ['concepto', 'empresa', ...cols];
  const insertVals = [concepto, empresa, ...vals];
  const ph = insertCols.map((_, i) => `$${i + 1}`);
  const updateSet = cols.map(c => `${c} = EXCLUDED.${c}`).join(',');
  const { rows } = await pool.query(
    `INSERT INTO sld_concepto_lsd (${insertCols.join(',')}) VALUES (${ph.join(',')})
     ON CONFLICT (concepto, empresa) DO UPDATE SET ${updateSet || 'concepto = EXCLUDED.concepto'}
     RETURNING ${COLS}`,
    insertVals
  );
  return rows[0];
}

module.exports = { getByConcepto, upsert };
