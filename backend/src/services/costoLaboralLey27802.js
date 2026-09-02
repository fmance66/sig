// Agregación de conceptos por categoría legal (Anexo III, Decreto 407/2026 — Ley 27.802
// de Modernización Laboral) para el recibo conforme al nuevo art. 140 LCT: separa el
// costo laboral en Sindical / Seguridad Social / Obra Social / INSSJP / ART / SCVO,
// mostrando el aporte del trabajador (columna DESCUENTO) junto al del empleador
// (columna CONTRIBUCION) en cada categoría.
//
// La categoría de cada concepto surge de los flags de sld_concepto_lsd — no hay campos
// dedicados a "Sindical" ni "SCVO" en ese esquema (piensa en SICOSS), así que se usan los
// slots genéricos que ya trae: libre1 = Sindical, libre2 = SCVO (ver plan de esta feature).
const pool = require('../config/db');

const CATEGORIAS = ['sindical', 'seguridadSocial', 'obraSocial', 'inssjp', 'art', 'scvo'];

function categoriasDeContribucion(l) {
  if (!l) return [];
  const cats = [];
  if (l.contribucion_sipa || l.contribucion_fne || l.contribucion_aaff) cats.push('seguridadSocial');
  if (l.contribucion_inssjyp) cats.push('inssjp');
  if (l.contribucion_obrasocial) cats.push('obraSocial');
  if (l.contribucion_lrt) cats.push('art');
  if (l.contribucion_libre1) cats.push('sindical');
  if (l.contribucion_libre2) cats.push('scvo');
  return cats;
}

function categoriasDeAporte(l) {
  if (!l) return [];
  const cats = [];
  if (l.aporte_sipa) cats.push('seguridadSocial');
  if (l.aporte_inssjyp) cats.push('inssjp');
  if (l.aporte_obrasocial) cats.push('obraSocial');
  if (l.aporte_libre1) cats.push('sindical');
  if (l.aporte_libre2) cats.push('scvo');
  return cats;
}

function categoriasVacias() {
  const obj = {};
  CATEGORIAS.forEach(c => { obj[c] = { empleador: 0, trabajador: 0 }; });
  return obj;
}

async function calcularCostoLaboral(periodo, empleado, numero) {
  const { rows } = await pool.query(
    `SELECT rc.concepto, rc.importe, c.columna, c.descripcion,
            l.contribucion_sipa, l.contribucion_inssjyp, l.contribucion_obrasocial,
            l.contribucion_fne, l.contribucion_aaff, l.contribucion_lrt,
            l.contribucion_libre1, l.contribucion_libre2,
            l.aporte_sipa, l.aporte_inssjyp, l.aporte_obrasocial,
            l.aporte_libre1, l.aporte_libre2
     FROM sld_recibo_concepto rc
     JOIN sld_concepto c ON c.id = rc.concepto AND c.empresa = rc.empresa
     LEFT JOIN sld_concepto_lsd l ON l.concepto = rc.concepto AND l.empresa = rc.empresa
     WHERE rc.periodo = $1 AND rc.empleado = $2 AND rc.numero = $3`,
    [periodo, empleado, numero]
  );

  const categorias = categoriasVacias();
  let contribucionSinCategoria = 0;
  let totalDescuento = 0;
  let descuentoCategorizado = 0;

  for (const row of rows) {
    const importe = Number(row.importe) || 0;
    if (row.columna === 'CONTRIBUCION') {
      const cats = categoriasDeContribucion(row);
      if (!cats.length) contribucionSinCategoria += importe;
      cats.forEach(cat => { categorias[cat].empleador += importe; });
    } else if (row.columna === 'DESCUENTO') {
      totalDescuento += importe;
      const cats = categoriasDeAporte(row);
      if (cats.length) descuentoCategorizado += importe;
      cats.forEach(cat => { categorias[cat].trabajador += importe; });
    }
  }

  // Descuentos que no son aporte a la seguridad social (préstamos, retención de
  // ganancias, etc.) — necesarios para que las porciones de la torta sumen el costo
  // laboral total exacto (sueldo neto + aportes + contribuciones).
  const otrosDescuentos = totalDescuento - descuentoCategorizado;

  return { categorias, contribucionSinCategoria, otrosDescuentos };
}

module.exports = { calcularCostoLaboral, CATEGORIAS };
