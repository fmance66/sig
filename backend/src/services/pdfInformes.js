const { renderToStream } = require('@react-pdf/renderer');
const pool = require('../config/db');
const recibosModel = require('../models/recibos');
const familiaresModel = require('../models/familiares');
const { ReciboInterpretadoDocument } = require('../pdf/reciboInterprete');
const { LibroInterpretadoDocument, SECCION_IDS: LIBRO_SECCION_IDS } = require('../pdf/libroInterprete');

// Diseño usado para el PDF de recibo — cualquiera de los otros ya migrados (RECIBO,
// RECIBO_FIX, HUSARES_4122) sirve con solo cambiar esta constante. Cada empresa tiene su
// propio diseño (sld_formulario_recibo.empresa) — se resuelve por empresa del recibo, con
// fallback a la primera empresa que tenga cargado ese nombre si la empresa del recibo no
// tiene su propio diseño todavía.
const FORMULARIO_RECIBO = 'RECIBO_A4';

async function cargarDisenoRecibo(empresa, nombre) {
  const { rows: formularioRows } = await pool.query(
    'SELECT * FROM sld_formulario_recibo WHERE empresa = $1 AND nombre = $2', [empresa, nombre]
  );
  const formulario = formularioRows[0];
  if (!formulario) return { formulario: undefined, parametros: [] };
  const { rows: parametros } = await pool.query(
    'SELECT * FROM sld_formulario_recibo_parametro WHERE formulario = $1 ORDER BY orden NULLS LAST, parametro', [formulario.id]
  );
  return { formulario, parametros };
}

async function streamRecibosPdf(recibos) {
  const disenoPorEmpresa = new Map();
  const bundles = [];
  for (const r of recibos) {
    const recibo = await recibosModel.getHeader(r.periodo, r.empleado, r.numero);
    const conceptos = await recibosModel.listConceptos(r.periodo, r.empleado, r.numero);
    const empresa = recibo.empresa_id;
    if (!disenoPorEmpresa.has(empresa)) {
      disenoPorEmpresa.set(empresa, await cargarDisenoRecibo(empresa, FORMULARIO_RECIBO));
    }
    bundles.push({ recibo, conceptos, diseno: disenoPorEmpresa.get(empresa) });
  }
  return renderToStream(ReciboInterpretadoDocument(bundles));
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
