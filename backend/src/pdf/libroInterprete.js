const React = require('react');
const { Document, Page, View } = require('@react-pdf/renderer');
const { antiguedadEnLetras } = require('./numeroALetras');
const { resolverContexto } = require('./reciboInterprete');
const {
  cm, fecha, logoDataUri, renderParametro, contextoConceptoFila, analizarGrilla,
} = require('./disenoComun');

const h = React.createElement;

// Cadena principal del diseño legacy (por `orden`): CABECERA(10) → EMPLEADO(100) →
// FAMILIARES(110, opcional) → CONCEPTOS(120) → TOTAL(130) → FIRMA(150). Quedan fuera a propósito
// LIQUIDACIONTOTAL (reporte de cierre de todo el período, no por empleado), CUERPO2/3/4,
// EMPLEADO_RECIBO, CABECERA_VACIA y las variantes _CMP — ver plan.
const SECCION_IDS = ['CABECERA', 'EMPLEADO', 'FAMILIARES', 'CONCEPTOS', 'TOTAL', 'FIRMA'];

// El diseño legacy trae las filas casi pegadas (ej. INTERLINEADO=0.20cm para texto de 8pt, más
// bajo que la propia letra — analizarGrilla toma ese salto de línea del `alto` del parámetro de
// control, no de su `y`). Ninguna sección del libro tiene cajas/bordes que dependan de un alto
// fijo (a diferencia del recibo, que sí — por eso este estiramiento es exclusivo del libro), así
// que alcanza con escalar y/alto de cada campo sin tocar x/ancho.
const ESPACIADO_VERTICAL = 1.8;

function espaciarSecciones(secciones) {
  const resultado = {};
  for (const [id, sec] of Object.entries(secciones)) {
    resultado[id] = {
      formulario: sec.formulario,
      parametros: sec.parametros.map(p => ({
        ...p, y: Number(p.y) * ESPACIADO_VERTICAL, alto: Number(p.alto) * ESPACIADO_VERTICAL,
      })),
    };
  }
  return resultado;
}

function resolverContextoLibro(recibo) {
  return {
    ...resolverContexto(recibo),
    EMPLEADO_FECHA_NACIMIENTO: fecha(recibo.fecha_nacimiento),
    EMPLEADO_LETRA_NACIMIENTO: '', // fecha de nacimiento en letras: no implementado (decorativo)
    EMPLEADO_FECHA_EGRESO: fecha(recibo.fecha_egreso),
    EMPLEADO_ANTIGUEDAD_LETRA: antiguedadEnLetras(recibo.fecha_ingreso),
    EMPLEADO_PROVINCIA: recibo.provincia || '',
    EMPLEADO_MODALIDAD: recibo.jornada || '',
    EMPLEADO_ESTADO_CIVIL: recibo.estado_civil || '',
    NUMERO_HOJA: '', // sin foliado implementado — el registro legacy numeraba la hoja impresa
  };
}

function contextoFamiliar(f) {
  return {
    FAMILIAR_APELLIDO_NOMBRE: `${f.apellido ?? ''} ${f.nombre ?? ''}`.trim(),
    FAMILIAR_TIPO_DOCUMENTO: f.tipo_documento || '',
    FAMILIAR_NUMERO_DOCUMENTO: f.numero_documento || '',
    FAMILIAR_PARENTESCO: f.parentesco || '',
    FAMILIAR_FECHA_ALTA: fecha(f.fecha_alta),
  };
}

// Borde inferior de una sección (usado para saber dónde empieza la siguiente al apilarlas).
function alturaSeccion(parametros) {
  if (!parametros.length) return 0;
  return Math.max(...parametros.map(p => Number(p.y) + Number(p.alto || 0)));
}

// FAMILIARES no es una grilla de conceptos (no usa tokens CONCEPTO_*/IMPORTE_*) — es otra grilla
// repetible, una fila por familiar. Convención propia de este diseño: los campos de cabecera
// terminan en "_LABEL" (fijos), y el campo sin ese sufijo es el que se repite por familiar.
function renderFamiliares(parametros, familiares, origenY, contexto, recibo, logoSrc, elementos) {
  const labelRows = parametros.filter(p => p.parametro.endsWith('_LABEL'));
  const templateRows = parametros.filter(p => !p.parametro.endsWith('_LABEL'));
  const lineHeight = Number(templateRows[0]?.alto) || 0.35;
  const gridStartY = templateRows.length ? Math.min(...templateRows.map(p => Number(p.y))) : 0;

  labelRows.forEach((p, i) => {
    const el = renderParametro({ ...p, y: Number(p.y) + origenY }, contexto, recibo, logoSrc, `fl${i}`);
    if (el) elementos.push(el);
  });
  familiares.forEach((f, i) => {
    const y = gridStartY + i * lineHeight + origenY;
    const contextoFila = { ...contexto, ...contextoFamiliar(f) };
    templateRows.forEach((p, j) => {
      const el = renderParametro({ ...p, y }, contextoFila, recibo, logoSrc, `ff${i}_${j}`);
      if (el) elementos.push(el);
    });
  });
  return gridStartY + Math.max(familiares.length, 1) * lineHeight;
}

// Apila secciones simples (todos sus parámetros, sin repetición) devolviendo dónde termina.
function renderSeccionSimple(seccion, origenY, contexto, recibo, logoSrc, elementos) {
  seccion.parametros.forEach((p, i) => {
    const el = renderParametro({ ...p, y: Number(p.y) + origenY }, contexto, recibo, logoSrc, `${seccion.formulario.id}${i}`);
    if (el) elementos.push(el);
  });
  return alturaSeccion(seccion.parametros);
}

// Arma las páginas de UN empleado: cabecera + datos + familiares (si tiene) + grilla de conceptos
// (paginada si no entra) + totales + firma. diseno.secciones: { CABECERA: {formulario,parametros}, ... }
function construirPaginasEmpleado({ recibo, conceptos, familiares, diseno }) {
  const secciones = espaciarSecciones(diseno.secciones);
  const contextoBase = resolverContextoLibro(recibo);
  const logoSrc = logoDataUri(recibo.empresa_logo);
  const cabecera = secciones.CABECERA;
  const conceptosSec = secciones.CONCEPTOS;
  const totalSec = secciones.TOTAL;
  const firmaSec = secciones.FIRMA;

  // 1. Cabecera + datos del empleado + familiares (una sola vez, arriba de todo).
  const previas = ['CABECERA', 'EMPLEADO', 'FAMILIARES']
    .filter(id => id !== 'FAMILIARES' || familiares.length > 0)
    .map(id => secciones[id])
    .filter(Boolean);

  const elementosPrevios = [];
  let cursorY = 0;
  previas.forEach((sec, idx) => {
    if (idx > 0) cursorY += Number(sec.formulario.margen_superior || 0);
    cursorY += sec.formulario.nombre === 'FAMILIARES'
      ? renderFamiliares(sec.parametros, familiares, cursorY, contextoBase, recibo, logoSrc, elementosPrevios)
      : renderSeccionSimple(sec, cursorY, contextoBase, recibo, logoSrc, elementosPrevios);
  });

  // 2. Grilla de conceptos, arrancando justo debajo de lo anterior. `saltoY` es un límite
  // ABSOLUTO de página (cerca del margen inferior físico, igual en toda la cadena — no relativo
  // al origen de la sección), así que la capacidad de cada página depende de dónde arranca: la
  // primera página tiene menos lugar (comparte página con cabecera/empleado/familiares), las de
  // desborde arrancan solas y aprovechan casi toda la hoja.
  cursorY += Number(conceptosSec.formulario.margen_superior || 0);
  const yConceptos = cursorY;
  const { templateRows, otherRows: labelRows, gridStartY, lineHeight, saltoY } = analizarGrilla(conceptosSec.parametros);
  const capacidad = origen => (Number.isFinite(saltoY)
    ? Math.max(1, Math.floor((saltoY - origen - gridStartY) / lineHeight) + 1)
    : Infinity);
  const filas = conceptos.filter(c => ['REMUNERATIVO', 'NO_REMUNERATIVO', 'DESCUENTO'].includes(c.columna));

  const lotes = [];
  let restante = filas;
  let origenPagina = yConceptos;
  do {
    const cap = capacidad(origenPagina);
    const lote = Number.isFinite(cap) ? restante.slice(0, cap) : restante;
    lotes.push({ origen: origenPagina, filas: lote });
    restante = restante.slice(lote.length);
    origenPagina = 0; // las páginas de desborde arrancan solas, con la sección en el origen
  } while (restante.length > 0);

  const paginas = [];
  lotes.forEach(({ origen, filas: loteFilas }, pag) => {
    const esPrimera = pag === 0;
    const esUltima = pag === lotes.length - 1;
    const elementos = esPrimera ? [...elementosPrevios] : [];

    labelRows.forEach((p, i) => {
      const el = renderParametro({ ...p, y: Number(p.y) + origen }, contextoBase, recibo, logoSrc, `cl${i}`);
      if (el) elementos.push(el);
    });

    loteFilas.forEach((c, i) => {
      const y = origen + gridStartY + i * lineHeight;
      const contextoFila = { ...contextoBase, ...contextoConceptoFila(c) };
      templateRows.forEach((p, j) => {
        const el = renderParametro({ ...p, y }, contextoFila, recibo, logoSrc, `cf${i}_${j}`);
        if (el) elementos.push(el);
      });
    });

    if (esUltima) {
      // TOTAL/FIRMA van justo debajo del contenido real de la grilla (no del límite de página
      // `saltoY`, que es la capacidad máxima de diseño — casi siempre mucho más de lo que ocupan
      // las líneas reales de un recibo).
      let yPie = origen + gridStartY + loteFilas.length * lineHeight;
      [totalSec, firmaSec].filter(Boolean).forEach((sec, idx) => {
        if (idx > 0) yPie += Number(sec.formulario.margen_superior || 0);
        yPie += renderSeccionSimple(sec, yPie, contextoBase, recibo, logoSrc, elementos);
      });
    }

    paginas.push({ elementos: elementos.filter(Boolean), formulario: esPrimera ? cabecera.formulario : conceptosSec.formulario });
  });
  return paginas;
}

function paginaReactPdf({ elementos, formulario }, key) {
  const orientation = formulario.orientacion === 'HORIZONTAL' ? 'landscape' : 'portrait';
  const size = ['A4', 'A5', 'LEGAL', 'LETTER'].includes(formulario.pagina) ? formulario.pagina : 'A4';
  const contenedorStyle = {
    position: 'relative',
    marginLeft: cm(formulario.margen_izquierdo),
    marginTop: cm(formulario.margen_superior),
  };
  return h(Page, { key, size, orientation, style: { fontFamily: 'Helvetica' } },
    h(View, { style: contenedorStyle }, ...elementos));
}

// bundles: [{ recibo, conceptos, familiares, diseno }] — cada bundle trae su propio diseno
// (puede variar por empresa). diseno.secciones: mapa id → { formulario, parametros } con las
// 6 secciones de la cadena (CABECERA..FIRMA) ya cargadas para esa empresa.
function LibroInterpretadoDocument(bundles) {
  const paginas = bundles.flatMap(b => construirPaginasEmpleado(b));
  return h(Document, null, ...paginas.map((p, i) => paginaReactPdf(p, i)));
}

module.exports = { LibroInterpretadoDocument, SECCION_IDS };
