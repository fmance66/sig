const React = require('react');
const { Document, Page, View } = require('@react-pdf/renderer');
const { pesosEnLetras } = require('./numeroALetras');
const { cm, money, fecha, logoDataUri, renderParametro, contextoConceptoFila, analizarGrilla } = require('./disenoComun');

const h = React.createElement;

// Cajas de la grilla de conceptos del recibo: se repiten en cada página (a diferencia del resto de
// los campos fijos, que solo van en la primera página si son de "cabecera" o en la última si son
// de "pie"). Es específico del diseño de recibo — el libro no tiene estas cajas.
const GRID_BOX_PARAMS = new Set([
  'BOX_CODIGO', 'BOX_CONCEPTO', 'BOX_UNIDAD',
  'BOX_REMUNERATIVO', 'BOX_NO_REMUNERATIVO', 'BOX_DESCUENTOS',
]);

// Aire horizontal del texto dentro de su caja (ver disenoComun.js::renderParametro). El recibo
// tiene mucho más margen que el libro en sus cajas (códigos de 2-3 dígitos en Arial, cajas de
// ~1.3cm) así que usa un valor más generoso en vez del mínimo por defecto.
const PADDING_HORIZONTAL = 3;

// "SIPA $140.382,13; INSSJPami $20.724,94; ..." — detalle de las contribuciones patronales
// (sld_concepto.columna = 'CONTRIBUCION') que arma el token CONTRIBUCIONES_TEXTO. El total en
// número (TOTAL_CONTRIBUCION) sale del header del recibo, no de sumar esta lista — mismo criterio
// que TOTAL_REMUNERATIVO/TOTAL_DESCUENTO/etc., que tampoco recalculan a partir de los conceptos.
function contribucionesTexto(conceptos) {
  return conceptos
    .filter(c => c.columna === 'CONTRIBUCION')
    .map(c => `${c.concepto_desc} $${money(c.importe)}`)
    .join('; ');
}

// Datos del recibo (ya "aplanados" por recibosModel.getHeader, incluyendo empresa/convenio/
// categoría/obra social/liquidación) traducidos a los tokens que usa el diseño legacy.
function resolverContexto(recibo, conceptos = []) {
  return {
    EMPRESA_RAZON_SOCIAL: recibo.empresa_razon_social || '',
    EMPRESA_DIRECCION: recibo.empresa_direccion || '',
    EMPRESA_LOCALIDAD: recibo.empresa_localidad || '',
    EMPRESA_CUIT: recibo.empresa_cuit || '',
    EMPRESA_ACTIVIDAD: recibo.empresa_actividad || '',
    EMPLEADO_LEGAJO: recibo.legajo || '',
    EMPLEADO_DIRECCION: recibo.empleado_direccion || '',
    EMPLEADO_LOCALIDAD: recibo.empleado_localidad || '',
    EMPLEADO_APELLIDO: recibo.apellido || '',
    EMPLEADO_NOMBRE: recibo.nombre || '',
    EMPLEADO_CUIL: recibo.cuil || '',
    EMPLEADO_FECHA_INGRESO: fecha(recibo.fecha_ingreso),
    EMPLEADO_SUELDO: money(recibo.sueldo),
    EMPLEADO_TAREA: recibo.tarea || '',
    EMPLEADO_CATEGORIA: recibo.categoria_desc || recibo.categoria || '',
    EMPLEADO_CONVENIO: recibo.convenio_desc || recibo.convenio || '',
    EMPLEADO_OBRA_SOCIAL: recibo.obra_social_desc || '',
    RECIBO_PERIODO: recibo.periodo_recibo || recibo.periodo || '',
    RECIBO_FECHA_PAGO: fecha(recibo.fecha_pago),
    RECIBO_OBSERVACIONES: recibo.observaciones || '',
    LIQUIDACION_FECHA_DEPOSITO: fecha(recibo.liq_fecha_deposito),
    LIQUIDACION_PERIODO_DEPOSITO: recibo.liq_periodo_deposito || '',
    LIQUIDACION_BANCO_DEPOSITO: recibo.liq_banco_deposito || '',
    LIQUIDACION_LUGAR_PAGO: recibo.liq_lugar_pago || '',
    TOTAL_REMUNERATIVO: money(recibo.remunerativo),
    TOTAL_NO_REMUNERATIVO: money(recibo.no_remunerativo),
    TOTAL_DESCUENTO: money(recibo.descuento),
    SUELDO_NETO: money(recibo.sueldo_neto),
    SUELDO_LETRA: pesosEnLetras(recibo.sueldo_neto),
    TOTAL_CONTRIBUCION: money(recibo.contribucion),
    CONTRIBUCIONES_TEXTO: contribucionesTexto(conceptos),
  };
}

// Ancho ocupado por los elementos del diseño (borde derecho más lejano) — usado para calcular
// dónde arranca la segunda copia cuando entran ambas en la misma hoja (ver más abajo).
function anchoDiseno(parametros) {
  return parametros.reduce((max, p) => Math.max(max, Number(p.x || 0) + Number(p.ancho || 0)), 0);
}

function construirPaginas({ recibo, conceptos, diseno }) {
  const { formulario, parametros } = diseno;
  const { templateRows, otherRows: fixedRows, gridStartY, lineHeight, saltoY } = analizarGrilla(parametros);
  const rowsPerPage = Number.isFinite(saltoY) ? Math.max(1, Math.floor((saltoY - gridStartY) / lineHeight) + 1) : Infinity;

  const filas = conceptos.filter(c => ['REMUNERATIVO', 'NO_REMUNERATIVO', 'DESCUENTO'].includes(c.columna));
  const totalPaginas = Math.max(1, Math.ceil(filas.length / (Number.isFinite(rowsPerPage) ? rowsPerPage : filas.length || 1)));

  const contextoBase = resolverContexto(recibo, conceptos);
  const logoSrc = logoDataUri(recibo.empresa_logo);

  // sld_formulario_recibo.copias >= 2 → además del original se imprime un duplicado (leyenda
  // ORIGINAL/DUPLICADO al pie, firma empleado/empleador — condicion en cada parámetro, ver
  // disenoComun.js::condicionCumple). Con menos de 2 copias configuradas, una sola pasada ORIGINAL
  // (comportamiento de siempre).
  const copias = Number(formulario.copias) >= 2 ? ['ORIGINAL', 'DUPLICADO'] : ['ORIGINAL'];

  // Los diseños HORIZONTAL vienen de papel continuo donde el original y el duplicado entran uno al
  // lado del otro en la misma hoja física (por eso el diseño ocupa bastante menos de la mitad del
  // ancho de una A4 apaisada) — se dibujan los elementos de la segunda copia corridos en X en vez
  // de armar una página aparte. En VERTICAL cada copia va en su propia página, como cualquier PDF.
  const mismaHoja = formulario.orientacion === 'HORIZONTAL' && copias.length > 1;
  const offsetCopia = mismaHoja ? anchoDiseno(parametros) + Number(formulario.margen_izquierdo || 0) : 0;

  function elementosDePagina(pag, copia, offsetX) {
    const desde = Number.isFinite(rowsPerPage) ? pag * rowsPerPage : 0;
    const hasta = Number.isFinite(rowsPerPage) ? desde + rowsPerPage : filas.length;
    const filasPagina = filas.slice(desde, hasta);
    const elementos = [];
    let k = 0;

    filasPagina.forEach((c, i) => {
      const y = gridStartY + i * lineHeight;
      const contextoFila = { ...contextoBase, ...contextoConceptoFila(c) };
      templateRows.forEach(p => {
        const pDesplazado = { ...p, y, x: Number(p.x) + offsetX };
        elementos.push(renderParametro(pDesplazado, contextoFila, recibo, logoSrc, `f${copia}_${pag}_${k++}`, PADDING_HORIZONTAL, copia));
      });
    });

    const esPrimera = pag === 0;
    const esUltima = pag === totalPaginas - 1;
    fixedRows.forEach(p => {
      const enCadaPagina = GRID_BOX_PARAMS.has(p.parametro);
      const esCabecera = Number(p.y) < gridStartY;
      const corresponde = enCadaPagina || (esCabecera ? esPrimera : esUltima);
      if (corresponde) {
        const pDesplazado = { ...p, x: Number(p.x) + offsetX };
        elementos.push(renderParametro(pDesplazado, contextoBase, recibo, logoSrc, `x${copia}_${pag}_${k++}`, PADDING_HORIZONTAL, copia));
      }
    });

    return elementos.filter(Boolean);
  }

  const paginas = [];
  if (mismaHoja) {
    for (let pag = 0; pag < totalPaginas; pag++) {
      const elementos = copias.flatMap((copia, i) => elementosDePagina(pag, copia, i * offsetCopia));
      paginas.push({ elementos, formulario });
    }
  } else {
    // Todas las páginas del original primero, después todas las del duplicado — el orden en que
    // se imprimirían si se saca por separado.
    copias.forEach(copia => {
      for (let pag = 0; pag < totalPaginas; pag++) {
        paginas.push({ elementos: elementosDePagina(pag, copia, 0), formulario });
      }
    });
  }
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

// bundles: [{ recibo, conceptos, diseno }] (recibo ya trae los datos de empresa/convenio/
// categoría/obra social/liquidación aplanados — ver recibosModel.getHeader). Cada bundle trae
// su propio diseno: { formulario, parametros } — puede variar por empresa.
function ReciboInterpretadoDocument(bundles) {
  const paginas = bundles.flatMap(b => construirPaginas(b));
  return h(Document, null, ...paginas.map((p, i) => paginaReactPdf(p, i)));
}

module.exports = { ReciboInterpretadoDocument, resolverContexto };
