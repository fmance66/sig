// Scraping asistido del tope previsional mensual (ANSES, art. 9° Ley 24.241,
// citado por la Guía Nº 31 LSD de ARCA) — usado para topear las bases
// imponibles de aportes del Libro de Sueldos Digital. No hay API pública de
// ANSES/ARCA para este valor (verificado 2026-09-08); esta es una fuente de
// terceros que transcribe el texto de la Resolución. El valor que devuelve
// NUNCA se persiste directo: solo se ofrece como default editable en pantalla
// (ver controllers/topePrevisional.js) — si el scrape falla o los dos anclajes
// de texto no coinciden, se devuelve null y el usuario carga el valor a mano.
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const MONTO = String.raw`(\d{1,3}(?:\.\d{3})*,\d{2})`;
const RE_RESUMEN = new RegExp(`Base imponible m[ií]nima:\\s*\\$${MONTO}\\.?\\s*Base imponible m[aá]xima:\\s*\\$${MONTO}`, 'i');
const RE_RESOLUCION = new RegExp(`art[ií]culo 9[°º]?\\s*de la Ley N[°º]?\\s*24\\.241[\\s\\S]{0,400}?\\(\\$${MONTO}\\)[\\s\\S]{0,200}?\\(\\$${MONTO}\\)`, 'i');

function urlPara(periodo) {
  const anio = periodo.slice(0, 4);
  const mes = MESES[Number(periodo.slice(4, 6)) - 1];
  if (!mes || !/^\d{4}$/.test(anio)) return null;
  return `https://contadoresenred.com/base-imponible-sipa-${mes}-${anio}-minima-y-maxima/`;
}

function limpiarMonto(s) {
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

// periodo: 'AAAAMM'. Devuelve { minimo, maximo, fuente } o null.
async function scrapear(periodo) {
  const url = urlPara(periodo);
  if (!url) return null;

  let texto;
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) return null;
    const html = await resp.text();
    texto = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  } catch {
    return null;
  }

  // Anclaje obligatorio: cita textual de la Resolución (art. 9° Ley 24.241).
  const resolucion = texto.match(RE_RESOLUCION);
  if (!resolucion) return null;
  const minimo = limpiarMonto(resolucion[1]);
  const maximo = limpiarMonto(resolucion[2]);

  // Anclaje opcional: resumen en texto plano, cuando el artículo lo trae —
  // si está y no coincide con la cita legal, algo no cierra y no confiamos.
  const resumen = texto.match(RE_RESUMEN);
  if (resumen) {
    const minResumen = limpiarMonto(resumen[1]);
    const maxResumen = limpiarMonto(resumen[2]);
    if (minResumen !== minimo || maxResumen !== maximo) return null;
  }

  return { minimo, maximo, fuente: url };
}

module.exports = { scrapear, urlPara };
