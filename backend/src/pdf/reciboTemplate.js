const React = require('react');
const { Document, Page, View, Text, StyleSheet } = require('@react-pdf/renderer');

const h = React.createElement;

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: 'Helvetica' },
  titulo: { fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: 'center' },
  datosBox: { border: '1pt solid #333', padding: 6, marginBottom: 8 },
  datosFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  label: { fontWeight: 700 },
  tablaHeader: { flexDirection: 'row', borderBottom: '1pt solid #333', paddingBottom: 3, marginBottom: 3, fontWeight: 700 },
  fila: { flexDirection: 'row', paddingVertical: 2, borderBottom: '0.5pt solid #ccc' },
  colConcepto: { width: '10%' },
  colDesc: { width: '38%' },
  colUnidad: { width: '12%', textAlign: 'right' },
  colImporte: { width: '20%', textAlign: 'right' },
  totales: { marginTop: 10, borderTop: '1pt solid #333', paddingTop: 6 },
  totalFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  totalDestacado: { fontWeight: 700, fontSize: 11 },
});

const money = v => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = v => v ? new Date(v).toLocaleDateString('es-AR') : '—';

function paginaRecibo({ recibo, conceptos }) {
  return h(Page, { size: 'A5', style: styles.page },
    h(Text, { style: styles.titulo }, 'Recibo de Sueldo'),
    h(View, { style: styles.datosBox },
      h(View, { style: styles.datosFila },
        h(Text, null, h(Text, { style: styles.label }, 'Legajo: '), recibo.legajo),
        h(Text, null, h(Text, { style: styles.label }, 'Período: '), recibo.periodo)),
      h(View, { style: styles.datosFila },
        h(Text, null, h(Text, { style: styles.label }, 'Apellido y Nombre: '), `${recibo.apellido ?? ''} ${recibo.nombre ?? ''}`)),
      h(View, { style: styles.datosFila },
        h(Text, null, h(Text, { style: styles.label }, 'CUIL: '), recibo.cuil ?? '—'),
        h(Text, null, h(Text, { style: styles.label }, 'Fecha: '), fecha(recibo.fecha_recibo))),
      h(View, { style: styles.datosFila },
        h(Text, null, h(Text, { style: styles.label }, 'Convenio: '), recibo.convenio ?? '—'),
        h(Text, null, h(Text, { style: styles.label }, 'Categoría: '), recibo.categoria ?? '—')),
      h(View, { style: styles.datosFila },
        h(Text, null, h(Text, { style: styles.label }, 'Tarea: '), recibo.tarea ?? '—'))),
    h(View, { style: styles.tablaHeader },
      h(Text, { style: styles.colConcepto }, 'Cód.'),
      h(Text, { style: styles.colDesc }, 'Concepto'),
      h(Text, { style: styles.colUnidad }, 'Unidad'),
      h(Text, { style: styles.colImporte }, 'Importe')),
    ...conceptos.map(c => h(View, { key: c.concepto, style: styles.fila },
      h(Text, { style: styles.colConcepto }, c.concepto),
      h(Text, { style: styles.colDesc }, c.concepto_desc || c.descripcion || ''),
      h(Text, { style: styles.colUnidad }, c.unidad != null ? money(c.unidad) : ''),
      h(Text, { style: styles.colImporte }, money(c.importe)))),
    h(View, { style: styles.totales },
      h(View, { style: styles.totalFila },
        h(Text, null, 'Total Remunerativo'), h(Text, null, money(recibo.remunerativo))),
      h(View, { style: styles.totalFila },
        h(Text, null, 'Total No Remunerativo'), h(Text, null, money(recibo.no_remunerativo))),
      h(View, { style: [styles.totalFila, styles.totalDestacado] },
        h(Text, null, 'Sueldo Bruto'), h(Text, null, money(recibo.sueldo_bruto))),
      h(View, { style: styles.totalFila },
        h(Text, null, 'Total Descuento'), h(Text, null, money(recibo.descuento))),
      h(View, { style: [styles.totalFila, styles.totalDestacado] },
        h(Text, null, 'Sueldo Neto'), h(Text, null, money(recibo.sueldo_neto)))));
}

// bundles: [{ recibo, conceptos }] — un recibo (cabecera + líneas) por página.
function ReciboDocument(bundles) {
  return h(Document, null, ...bundles.map(b => paginaRecibo(b)));
}

module.exports = { ReciboDocument };
