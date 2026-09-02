// Recibo conforme al modelo del Anexo III, Decreto 407/2026 (reglamentario de la Ley
// 27.802 de Modernización Laboral, que modificó el art. 140 LCT). A diferencia de
// reciboInterprete.js (que replica el diseño legacy propio de cada empresa mediante
// cajas x/y configurables), este es un layout fijo por ley — no hay nada que
// personalizar por empresa, así que se arma directo en flexbox.
//
// 4 secciones (Art. 5, Decreto 407/2026): (a) datos empleador/trabajador,
// (b) contribuciones a cargo del empleador, (c) sueldo bruto y deducciones,
// (d) sueldo neto — más el resumen por categoría y el gráfico de torta del costo
// laboral total que exige el Anexo III.
const React = require('react');
const { Document, Page, View, Text, Image, Svg, Path } = require('@react-pdf/renderer');
const { money, fecha, logoDataUri, unidad } = require('./disenoComun');
const { pesosEnLetras, antiguedadEnLetras } = require('./numeroALetras');
const { calcularCostoLaboral, CATEGORIAS } = require('../services/costoLaboralLey27802');

const h = React.createElement;

const CATEGORIA_LABEL = {
  sindical: 'Sindical', seguridadSocial: 'Seguridad Social', obraSocial: 'Obra Social',
  inssjp: 'INSSJP', art: 'ART', scvo: 'SCVO',
};

const COLOR = {
  sueldoNeto: '#4caf50', sindical: '#9c27b0', seguridadSocial: '#2196f3',
  obraSocial: '#009688', inssjp: '#ff9800', art: '#f44336', scvo: '#795548', otros: '#9e9e9e',
};

const s = {
  page: { fontFamily: 'Helvetica', fontSize: 7.5, padding: 18, color: '#222' },
  tituloEmpresa: { fontSize: 11, fontWeight: 700 },
  filaHeader: { flexDirection: 'row', marginTop: 6 },
  logo: { width: 80, height: 38, objectFit: 'contain' },
  tabla: { borderTopWidth: 0.75, borderLeftWidth: 0.75, borderColor: '#000', marginTop: 5 },
  filaTabla: { flexDirection: 'row' },
  celda: { borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: '#000', paddingVertical: 1.5, paddingHorizontal: 3, flexGrow: 1, flexBasis: 0 },
  celdaLabel: { backgroundColor: '#e5e5e5', fontWeight: 700, fontSize: 6.5 },
  barraTitulo: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#333',
    color: '#fff', paddingVertical: 2.5, paddingHorizontal: 4, marginTop: 5, fontSize: 8.5, fontWeight: 700,
  },
  filaConcepto: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#ccc', paddingVertical: 1 },
  colConcepto: { flexGrow: 1, flexBasis: 0 },
  colUnidad: { width: 55, textAlign: 'right' },
  colMonto: { width: 75, textAlign: 'right' },
  subtotal: {
    flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.75,
    borderColor: '#000', paddingTop: 2, marginTop: 1, fontWeight: 700,
  },
};

function direccionEmpresa(recibo) {
  const localidad = recibo.empresa_cpa
    ? [recibo.empresa_localidad, `(${recibo.empresa_cpa})`].filter(Boolean).join(' ')
    : recibo.empresa_localidad;
  const partes = [recibo.empresa_direccion, localidad, recibo.empresa_provincia].filter(Boolean);
  return partes.join(', ');
}

function celda(texto, extra) {
  return h(View, { style: [s.celda, extra?.label ? s.celdaLabel : null] },
    h(Text, null, texto ?? ''));
}

function filaDatos(pares) {
  // pares: [[label, valor], ...] — una fila con N columnas iguales, label arriba, valor abajo
  return h(View, { style: s.tabla },
    h(View, { style: s.filaTabla }, ...pares.map(([label]) => celda(label, { label: true }))),
    h(View, { style: s.filaTabla }, ...pares.map(([, valor]) => celda(valor))));
}

function tablaConceptos(conceptos, { mostrarUnidad = true } = {}) {
  return h(View, { style: { marginTop: 2 } },
    h(View, { style: [s.filaConcepto, { borderBottomWidth: 0.75, fontWeight: 700 }] },
      h(Text, { style: s.colConcepto }, 'Concepto'),
      mostrarUnidad && h(Text, { style: s.colUnidad }, 'Unidad'),
      h(Text, { style: s.colMonto }, 'Monto')),
    ...conceptos.map((c, i) => h(View, { key: i, style: s.filaConcepto },
      h(Text, { style: s.colConcepto }, `${c.concepto} ${c.concepto_desc || ''}`),
      mostrarUnidad && h(Text, { style: s.colUnidad }, c.unidad != null ? `${unidad(c.unidad, c.decimales_unidad)} ${c.simbolo_unidad || ''}` : ''),
      h(Text, { style: s.colMonto }, money(c.importe)))));
}

// Arma el path SVG de una porción de torta. angulos en radianes, 0 = 12 en punto,
// sentido horario. r = radio, cx/cy = centro.
function porcionPath(cx, cy, r, desde, hasta) {
  const x1 = cx + r * Math.sin(desde), y1 = cy - r * Math.cos(desde);
  const x2 = cx + r * Math.sin(hasta), y2 = cy - r * Math.cos(hasta);
  const largeArc = hasta - desde > Math.PI ? 1 : 0;
  return `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`;
}

function graficoTorta(porciones, total) {
  const r = 36, cx = 44, cy = 40;
  const validas = porciones.filter(p => p.valor > 0.005);
  let acumulado = 0;
  const slices = validas.map(p => {
    const desde = (acumulado / total) * 2 * Math.PI;
    acumulado += p.valor;
    const hasta = (acumulado / total) * 2 * Math.PI;
    return { ...p, path: porcionPath(cx, cy, r, desde, hasta) };
  });
  return h(View, { style: { alignItems: 'center' } },
    h(Text, { style: { fontSize: 7.5, fontWeight: 700, marginBottom: 2 } }, 'Costo total empleador'),
    h(Svg, { width: 88, height: 80, viewBox: '0 0 88 80' },
      ...slices.map((sl, i) => h(Path, { key: i, d: sl.path, fill: sl.color }))),
    h(View, { style: { marginTop: 2 } },
      ...validas.map((p, i) => h(View, { key: i, style: { flexDirection: 'row', alignItems: 'center', marginTop: 1 } },
        h(View, { style: { width: 5, height: 5, backgroundColor: p.color, marginRight: 2 } }),
        h(Text, { style: { fontSize: 5.5 } }, `${p.label} (${((p.valor / total) * 100).toFixed(1)}%)`)))));
}

// Empleador/Trabajador en la misma línea (en vez de una fila cada uno) para que el
// bloque entero entre cómodo junto al gráfico sin desbordar a una página nueva.
function filaCategoria(label, empleador, trabajador, sinTrabajador) {
  return h(View, { style: { flexDirection: 'row', marginBottom: 1 } },
    h(Text, { style: { width: 80, fontWeight: 700 } }, label),
    h(Text, { style: { width: 120 } }, `Empleador: ${money(empleador)}`),
    !sinTrabajador && h(Text, null, `Trabajador: ${money(trabajador)}`));
}

function detalleCategorias(categorias, contribucionSinCategoria, otrosDescuentos) {
  return h(View, { style: { flexGrow: 1, marginRight: 10 } },
    h(Text, { style: { fontWeight: 700, fontSize: 8, marginBottom: 2 } }, 'Detalle de la composición salarial'),
    ...CATEGORIAS.map(cat => filaCategoria(
      CATEGORIA_LABEL[cat], categorias[cat].empleador, categorias[cat].trabajador,
      cat === 'art' || cat === 'scvo'
    )),
    (contribucionSinCategoria > 0 || otrosDescuentos > 0) &&
      filaCategoria('Otros', contribucionSinCategoria, otrosDescuentos));
}

// "Firma del empleado" en el original / "Firma del empleador" en el duplicado — misma
// convención de sld_formulario_recibo_parametro (parámetros FIRMA_EMPLEADO/FIRMA_EMPLEADOR,
// condición ORIGINAL/DUPLICADO) que usa reciboInterprete.js para los diseños por empresa.
function bloqueFirma(copia) {
  const label = copia === 'ORIGINAL' ? 'Firma del empleado' : 'Firma del empleador';
  return h(View, { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 } },
    h(Text, { style: { fontSize: 6.5, fontWeight: 700, color: '#666' } }, copia),
    h(View, { style: { alignItems: 'center' } },
      // Espacio en blanco reservado para la firma manuscrita, arriba de la línea —
      // fijo e independiente del marginTop del bloque, para que siempre haya lugar
      // aunque el párrafo de "Recibí la suma de..." ocupe más de una línea.
      h(View, { style: { height: 28 } }),
      h(View, { style: { width: 170, borderTopWidth: 0.75, borderColor: '#000' } }),
      h(Text, { style: { fontSize: 6, marginTop: 2 } }, label)));
}

// Calcula una sola vez los datos del recibo (implica una consulta a costoLaboralLey27802.js)
// para poder armar las dos copias (ORIGINAL/DUPLICADO) sin repetir esa consulta.
async function datosRecibo(recibo, conceptos) {
  const { categorias, contribucionSinCategoria, otrosDescuentos } = await calcularCostoLaboral(
    recibo.periodo, recibo.empleado, recibo.numero
  );

  const remunerativos = conceptos.filter(c => c.columna === 'REMUNERATIVO' || c.columna === 'NO_REMUNERATIVO');
  const descuentos = conceptos.filter(c => c.columna === 'DESCUENTO');
  const contribuciones = conceptos.filter(c => c.columna === 'CONTRIBUCION');
  const logoSrc = logoDataUri(recibo.empresa_logo);
  const costoTotalEmpleador = Number(recibo.costo_laboral) || (Number(recibo.sueldo_bruto) + Number(recibo.contribucion));

  const porcionesTorta = [
    { label: 'Sueldo Neto', valor: Number(recibo.sueldo_neto) || 0, color: COLOR.sueldoNeto },
    ...CATEGORIAS.map(cat => ({
      label: CATEGORIA_LABEL[cat],
      valor: categorias[cat].empleador + categorias[cat].trabajador,
      color: COLOR[cat],
    })),
    { label: 'Otros', valor: contribucionSinCategoria + otrosDescuentos, color: COLOR.otros },
  ];

  return {
    recibo, categorias, contribucionSinCategoria, otrosDescuentos,
    remunerativos, descuentos, contribuciones, logoSrc, costoTotalEmpleador, porcionesTorta,
  };
}

function paginaRecibo(datos, copia) {
  const {
    recibo, categorias, contribucionSinCategoria, otrosDescuentos,
    remunerativos, descuentos, contribuciones, logoSrc, costoTotalEmpleador, porcionesTorta,
  } = datos;

  return h(Page, { size: 'A4', style: s.page },
    h(View, { style: { flexDirection: 'row', justifyContent: 'space-between' } },
      h(View, null,
        h(Text, { style: s.tituloEmpresa }, recibo.empresa_razon_social || ''),
        h(Text, null, direccionEmpresa(recibo)),
        h(Text, null, `C.U.I.T.: ${recibo.empresa_cuit || ''}`)),
      logoSrc && h(Image, { src: logoSrc, style: s.logo })),

    filaDatos([
      ['Legajo', recibo.legajo], ['Apellido y Nombre', `${recibo.apellido || ''} ${recibo.nombre || ''}`],
      ['C.U.I.L.', recibo.cuil], ['Sueldo Bruto', money(recibo.sueldo_bruto)],
      ['Antigüedad', antiguedadEnLetras(recibo.fecha_ingreso) || '-'],
    ]),
    filaDatos([
      ['Fecha Ingreso', fecha(recibo.fecha_ingreso)],
      ['Categoría Laboral', recibo.categoria_desc || recibo.categoria || ''],
      ['Convenio', recibo.convenio_desc || recibo.convenio || ''],
      ['Período Abonado', recibo.periodo_recibo || recibo.periodo],
      ['Fecha de Pago', fecha(recibo.fecha_pago || recibo.liq_fecha_pago)],
    ]),

    h(View, { style: s.barraTitulo },
      h(Text, null, 'COSTO TOTAL EMPLEADOR'), h(Text, null, money(costoTotalEmpleador))),
    tablaConceptos(contribuciones, { mostrarUnidad: false }),
    h(View, { style: s.subtotal },
      h(Text, null, 'SUB TOTAL CONTRIBUCIONES EMPLEADOR'), h(Text, null, money(recibo.contribucion))),

    h(View, { style: s.barraTitulo }, h(Text, null, 'SUELDO BRUTO'), h(Text, null, money(recibo.sueldo_bruto))),
    tablaConceptos(remunerativos),
    h(View, { style: { marginTop: 4, fontWeight: 700, fontSize: 6.5 } }, h(Text, null, 'Deducciones del trabajador')),
    tablaConceptos(descuentos),

    h(View, { style: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, fontSize: 6.5 } },
      h(Text, null, `Remunerativo: ${money(recibo.remunerativo)}`),
      h(Text, null, `No Remunerativo: ${money(recibo.no_remunerativo)}`),
      h(Text, null, `Descuentos: ${money(recibo.descuento)}`)),

    h(View, { style: s.barraTitulo }, h(Text, null, 'SUELDO NETO'), h(Text, null, money(recibo.sueldo_neto))),
    h(Text, { style: { fontSize: 6.5, marginTop: 2 } },
      `Recibí la suma de pesos ${pesosEnLetras(recibo.sueldo_neto)} en concepto de mi remuneración correspondiente al período indicado.`),
    bloqueFirma(copia),

    h(View, { wrap: false, style: { flexDirection: 'row', marginTop: 30 } },
      detalleCategorias(categorias, contribucionSinCategoria, otrosDescuentos),
      graficoTorta(porcionesTorta, costoTotalEmpleador)),

    h(Text, { style: { fontSize: 5.5, marginTop: 5, color: '#666' } },
      'Nota: Seguridad Social del empleador incluye SIPA, Fondo Nacional de Empleo y Asignaciones Familiares — recibo conforme al art. 140 LCT (t.o. Ley 27.802) y su Anexo III (Decreto 407/2026).'));
}

// bundles: [{ recibo, conceptos }]. Devuelve los <Page> ya armados (sin envolver en
// <Document>) — pdfInformes.js los combina con los de reciboInterprete.js cuando un lote
// mezcla empresas con distinto diseño activo. Cada recibo sale por duplicado (ORIGINAL +
// DUPLICADO, cada uno con su propia leyenda de firma), intercalados por empleado —
// mismo criterio que reciboInterprete.js: original y duplicado de un empleado quedan
// uno al lado del otro antes de pasar al siguiente empleado.
async function paginasRecibo(bundles) {
  const datosList = await Promise.all(bundles.map(b => datosRecibo(b.recibo, b.conceptos)));
  return datosList.flatMap(d => [paginaRecibo(d, 'ORIGINAL'), paginaRecibo(d, 'DUPLICADO')]);
}

async function ReciboLey27802Document(bundles) {
  return h(Document, null, ...(await paginasRecibo(bundles)));
}

module.exports = { ReciboLey27802Document, paginasRecibo };
