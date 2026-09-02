const React = require('react');
const { Document, renderToStream } = require('@react-pdf/renderer');
const pool = require('../config/db');
const recibosModel = require('../models/recibos');
const familiaresModel = require('../models/familiares');
const { paginasRecibo: paginasReciboInterprete } = require('../pdf/reciboInterprete');
const { LibroInterpretadoDocument, SECCION_IDS: LIBRO_SECCION_IDS } = require('../pdf/libroInterprete');
const { paginasRecibo: paginasReciboLey27802 } = require('../pdf/reciboLey27802');

const h = React.createElement;

// Diseño usado para el PDF de recibo — cada empresa tiene varios diseños guardados
// (RECIBO, RECIBO_A4, RECIBO_FIX, HUSARES_4122, RECIBO_LEY_27802...) y se usa el que
// esté marcado `activo` (ver sld_formulario_recibo_activo_uk — a lo sumo uno por
// empresa, se cambia desde "Diseño de Recibos de Sueldo" en el frontend). Si el diseño
// activo tiene `ley_27802 = true`, no se interpreta con el motor de cajas x/y: se arma
// con el layout fijo de reciboLey27802.js (Anexo III, Decreto 407/2026) — ver más abajo.
async function cargarDisenoRecibo(empresa) {
  const { rows: formularioRows } = await pool.query(
    'SELECT * FROM sld_formulario_recibo WHERE empresa = $1 AND activo', [empresa]
  );
  const formulario = formularioRows[0];
  if (!formulario) return { formulario: undefined, parametros: [] };
  const { rows: parametros } = await pool.query(
    'SELECT * FROM sld_formulario_recibo_parametro WHERE formulario = $1 ORDER BY orden NULLS LAST, parametro', [formulario.id]
  );
  return { formulario, parametros };
}

// Un mismo lote de recibos puede mezclar empresas con distinto diseño activo (algunas
// con el motor de cajas x/y, otras con el formato fijo de la Ley 27.802) — se arman las
// páginas de cada motor por separado y se combinan en un único <Document>, en vez de
// generar dos PDFs. El orden de los conceptos dentro de cada motor no se toca; entre
// motores, primero van los recibos del motor de cajas y después los de Ley 27.802.
async function streamRecibosPdf(recibos) {
  const disenoPorEmpresa = new Map();
  const bundlesInterprete = [];
  const bundlesLey27802 = [];
  for (const r of recibos) {
    const recibo = await recibosModel.getHeader(r.periodo, r.empleado, r.numero);
    const conceptos = await recibosModel.listConceptos(r.periodo, r.empleado, r.numero);
    const empresa = recibo.empresa_id;
    if (!disenoPorEmpresa.has(empresa)) {
      disenoPorEmpresa.set(empresa, await cargarDisenoRecibo(empresa));
    }
    const diseno = disenoPorEmpresa.get(empresa);
    if (diseno.formulario?.ley_27802) {
      bundlesLey27802.push({ recibo, conceptos });
    } else {
      bundlesInterprete.push({ recibo, conceptos, diseno });
    }
  }
  const paginas = [
    ...(bundlesInterprete.length ? paginasReciboInterprete(bundlesInterprete) : []),
    ...(bundlesLey27802.length ? await paginasReciboLey27802(bundlesLey27802) : []),
  ];
  return renderToStream(h(Document, null, ...paginas));
}

async function cargarDisenoLibro(empresa) {
  const secciones = {};
  for (const nombre of LIBRO_SECCION_IDS) {
    const { rows: formularioRows } = await pool.query(
      'SELECT * FROM sld_formulario_libro WHERE empresa = $1 AND nombre = $2', [empresa, nombre]
    );
    const formulario = formularioRows[0];
    if (!formulario) continue;
    const { rows: parametros } = await pool.query(
      'SELECT * FROM sld_formulario_libro_parametro WHERE formulario = $1 ORDER BY orden NULLS LAST, parametro', [formulario.id]
    );
    secciones[nombre] = { formulario, parametros };
  }
  return { secciones };
}

async function streamLibroPdf(recibos) {
  const disenoPorEmpresa = new Map();
  const bundles = [];
  for (const r of recibos) {
    const recibo = await recibosModel.getHeader(r.periodo, r.empleado, r.numero);
    const conceptos = await recibosModel.listConceptos(r.periodo, r.empleado, r.numero);
    const familiares = await familiaresModel.listByEmpleado(r.empleado);
    const empresa = recibo.empresa_id;
    if (!disenoPorEmpresa.has(empresa)) {
      disenoPorEmpresa.set(empresa, await cargarDisenoLibro(empresa));
    }
    bundles.push({ recibo, conceptos, familiares, diseno: disenoPorEmpresa.get(empresa) });
  }
  return renderToStream(LibroInterpretadoDocument(bundles));
}

module.exports = { streamRecibosPdf, streamLibroPdf };
