const React = require('react');
const { View, Text, Image } = require('@react-pdf/renderer');

const h = React.createElement;

const CM_A_PT = 28.3465;
const cm = v => Number(v || 0) * CM_A_PT;

const money = v => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = v => v ? new Date(v).toLocaleDateString('es-AR') : '';

// Tokens (columna `texto`, no el nombre de `parametro` — ese varía entre diseños: el recibo usa
// CODIGO_CONCEPTO/IMPORTE_REMUNERATIVO, el libro usa CONCEPTO/REMUNERATIVO, pero ambos apuntan a
// estos mismos 7 tokens) que arman la fila plantilla de una grilla de conceptos repetible.
const ROW_TEMPLATE_TOKENS = new Set([
  'CONCEPTO_CODIGO', 'CONCEPTO_DESCRIPCION', 'CONCEPTO_UNIDAD', 'CONCEPTO_SIMBOLO',
  'IMPORTE_REMUNERATIVO', 'IMPORTE_NO_REMUNERATIVO', 'IMPORTE_DESCUENTO',
]);
// Parámetros de control (no se dibujan, configuran la repetición): identificados por su token,
// no por el nombre de parámetro (que también varía: 'SALTO_DE_PAGINA' vs 'INTERLINEADO').
const CONTROL_TOKENS = new Set(['INTERLINEADO_CONCEPTO', 'SALTO_DE_PAGINA_CONCEPTO']);

const FONT_FAMILIAS = { COURIER: 'Courier', TIMES: 'Times-Roman' };
const ALIGN_MAP = { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' };

function parseColor(raw) {
  if (!raw) return null;
  const partes = raw.split(',').map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) return null;
  return `rgb(${partes.join(', ')})`;
}

function parseFont(raw) {
  const [familia, peso, tamano, color] = (raw || '').split('|');
  return {
    fontFamily: FONT_FAMILIAS[familia] || 'Helvetica',
    fontWeight: peso === 'BOLD' ? 700 : 'normal',
    fontSize: Number(tamano) || 8,
    ...(parseColor(color) ? { color: parseColor(color) } : {}),
  };
}

function logoDataUri(logo) {
  if (!logo || !logo.length) return null;
  const esPng = logo[0] === 0x89 && logo[1] === 0x50;
  return `data:${esPng ? 'image/png' : 'image/jpeg'};base64,${Buffer.from(logo).toString('base64')}`;
}

// Reemplaza cada token (MAYÚSCULA_CON_GUION_BAJO) por su valor resuelto, dejando el resto del
// texto literal tal cual — incluye puntuación pegada al token (ej. "(EMPLEADO_LETRA_NACIMIENTO)").
function sustituirTexto(texto, contexto) {
  if (!texto) return '';
  const sustituido = texto.trim().replace(/[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9_]*/g, tok => (tok in contexto ? contexto[tok] : tok));
  // El dump legacy trae algún texto con tabs/espacios dobles (ver bas_formulario_parametro) —
  // se normaliza a espacio simple.
  return sustituido.replace(/\s+/g, ' ');
}

// Solo 3 condiciones distintas aparecen en los diseños migrados (no hace falta un evaluador de
// expresiones genérico). ORIGINAL/DUPLICADO controlan qué leyenda/campo va en cada copia física
// del recibo cuando el formulario tiene `copias` >= 2 (ver reciboInterprete.js::construirPaginas,
// que arma una pasada por cada copia y pasa cuál es acá).
function condicionCumple(condicion, recibo, copia = 'ORIGINAL') {
  if (!condicion || !condicion.trim()) return true;
  switch (condicion.trim()) {
    case 'TIENE_CATEGORIA': return Boolean(recibo.categoria);
    case 'ORIGINAL': return copia === 'ORIGINAL';
    case 'DUPLICADO': return copia === 'DUPLICADO';
    default: return false;
  }
}

// paddingHorizontal por defecto = lo mínimo que no trunca las etiquetas más angostas del libro
// (ej. "Legajo:", ya vienen con el ancho justo para su texto en Courier Bold 8). El recibo tiene
// mucho más margen en sus cajas (códigos de 2-3 dígitos en Arial) y usa un valor mayor — ver
// reciboInterprete.js.
function renderParametro(param, contexto, recibo, logoSrc, key, paddingHorizontal = 1, copia = 'ORIGINAL') {
  if (param.print === false || !condicionCumple(param.condicion, recibo, copia)) return null;

  const style = {
    position: 'absolute',
    left: cm(param.x), top: cm(param.y), width: cm(param.ancho), height: cm(param.alto),
    justifyContent: 'center',
  };
  const borderColor = parseColor(param.border_color);
  const backgroundColor = parseColor(param.background_color);
  if (borderColor) style.border = `0.75pt solid ${borderColor}`;
  if (backgroundColor) style.backgroundColor = backgroundColor;

  const textoRaw = (param.texto || '').trim();
  if (textoRaw === 'LOGO') {
    return logoSrc
      ? h(View, { key, style }, h(Image, { src: logoSrc, style: { objectFit: 'contain' } }))
      : h(View, { key, style });
  }
  if (textoRaw.startsWith('LOGO(')) {
    // Firma digitalizada: el esquema nuevo no tiene dónde guardarla — se deja el espacio en blanco.
    return h(View, { key, style });
  }

  const textoResuelto = sustituirTexto(param.texto, contexto);
  if (!textoResuelto) return h(View, { key, style });

  // Centrado vertical dentro de la caja (justifyContent en el View de arriba) + aire a los dos
  // lados para que no quede pegado a la línea divisoria de la caja vecina.
  const alignment = ALIGN_MAP[param.alignment] || 'left';
  const textStyle = { ...parseFont(param.font), textAlign: alignment, paddingHorizontal };
  return h(View, { key, style }, h(Text, { style: textStyle }, textoResuelto));
}

// Tokens por línea de una fila de la grilla de conceptos (recibo y libro comparten esta forma).
function contextoConceptoFila(c) {
  return {
    CONCEPTO_CODIGO: c.concepto,
    CONCEPTO_DESCRIPCION: c.concepto_desc || c.descripcion || '',
    CONCEPTO_UNIDAD: c.unidad != null ? String(c.unidad) : '',
    CONCEPTO_SIMBOLO: c.simbolo_unidad || '',
    IMPORTE_REMUNERATIVO: c.columna === 'REMUNERATIVO' ? money(c.importe) : '',
    IMPORTE_NO_REMUNERATIVO: c.columna === 'NO_REMUNERATIVO' ? money(c.importe) : '',
    IMPORTE_DESCUENTO: c.columna === 'DESCUENTO' ? money(c.importe) : '',
  };
}

// Separa los parámetros de una sección tipo "grilla de conceptos" en fila plantilla / control /
// resto, y calcula desde dónde arranca la grilla, cuánto mide cada línea y dónde corta la página.
function analizarGrilla(parametros) {
  const templateRows = parametros.filter(p => ROW_TEMPLATE_TOKENS.has((p.texto || '').trim()));
  const controlRows = parametros.filter(p => CONTROL_TOKENS.has((p.texto || '').trim()));
  const otherRows = parametros.filter(p => !templateRows.includes(p) && !controlRows.includes(p));

  const gridStartY = templateRows.length ? Math.min(...templateRows.map(p => Number(p.y))) : 0;
  const interlineado = controlRows.find(p => (p.texto || '').trim() === 'INTERLINEADO_CONCEPTO');
  const lineHeight = Number(interlineado?.alto) || Number(templateRows[0]?.alto) || 0.6;
  const salto = controlRows.find(p => (p.texto || '').trim() === 'SALTO_DE_PAGINA_CONCEPTO');
  const saltoY = salto ? Number(salto.y) : Infinity;

  return { templateRows, controlRows, otherRows, gridStartY, lineHeight, saltoY };
}

module.exports = {
  cm, money, fecha, parseColor, parseFont, logoDataUri, sustituirTexto, condicionCumple,
  renderParametro, contextoConceptoFila, analizarGrilla,
};
