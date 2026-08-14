const React = require('react');
const { Document, Page, View, Text, StyleSheet } = require('@react-pdf/renderer');

const h = React.createElement;

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: 'Helvetica' },
  titulo: { fontSize: 12, fontWeight: 700, marginBottom: 8, textAlign: 'center' },
  header: { flexDirection: 'row', borderBottom: '1pt solid #333', paddingBottom: 3, marginBottom: 3, fontWeight: 700 },
  fila: { flexDirection: 'row', paddingVertical: 2, borderBottom: '0.5pt solid #ccc' },
  totalFila: { flexDirection: 'row', paddingVertical: 3, borderTop: '1pt solid #333', marginTop: 2, fontWeight: 700 },
  colLegajo: { width: '8%' },
  colNombre: { width: '24%' },
  colPeriodo: { width: '10%' },
  colFecha: { width: '10%' },
  colMonto: { width: '12%', textAlign: 'right' },
});

const money = v => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = v => v ? new Date(v).toLocaleDateString('es-AR') : '—';

function LibroDocument(recibos) {
  const totales = recibos.reduce((acc, r) => ({
    remunerativo: acc.remunerativo + Number(r.remunerativo || 0),
    no_remunerativo: acc.no_remunerativo + Number(r.no_remunerativo || 0),
    descuento: acc.descuento + Number(r.descuento || 0),
    sueldo_neto: acc.sueldo_neto + Number(r.sueldo_neto || 0),
    sueldo_bruto: acc.sueldo_bruto + Number(r.sueldo_bruto || 0),
  }), { remunerativo: 0, no_remunerativo: 0, descuento: 0, sueldo_neto: 0, sueldo_bruto: 0 });

  return h(Document, null,
    h(Page, { size: 'A4', orientation: 'landscape', style: styles.page },
      h(Text, { style: styles.titulo, fixed: true }, 'Libro de Sueldos'),
      h(View, { style: styles.header, fixed: true },
        h(Text, { style: styles.colLegajo }, 'Legajo'),
        h(Text, { style: styles.colNombre }, 'Apellido y Nombre'),
        h(Text, { style: styles.colPeriodo }, 'Período'),
        h(Text, { style: styles.colFecha }, 'Fecha'),
        h(Text, { style: styles.colMonto }, 'Remunerativo'),
        h(Text, { style: styles.colMonto }, 'No Remun.'),
        h(Text, { style: styles.colMonto }, 'Descuento'),
        h(Text, { style: styles.colMonto }, 'Sueldo Neto'),
        h(Text, { style: styles.colMonto }, 'Sueldo Bruto')),
      ...recibos.map(r => h(View, { key: `${r.periodo}-${r.empleado}-${r.numero}`, style: styles.fila, wrap: false },
        h(Text, { style: styles.colLegajo }, r.legajo),
        h(Text, { style: styles.colNombre }, `${r.apellido ?? ''} ${r.nombre ?? ''}`),
        h(Text, { style: styles.colPeriodo }, r.periodo),
        h(Text, { style: styles.colFecha }, fecha(r.fecha_recibo)),
        h(Text, { style: styles.colMonto }, money(r.remunerativo)),
        h(Text, { style: styles.colMonto }, money(r.no_remunerativo)),
        h(Text, { style: styles.colMonto }, money(r.descuento)),
        h(Text, { style: styles.colMonto }, money(r.sueldo_neto)),
        h(Text, { style: styles.colMonto }, money(r.sueldo_bruto)))),
      h(View, { style: styles.totalFila },
        h(Text, { style: [styles.colLegajo, styles.colNombre, styles.colPeriodo, styles.colFecha] }, 'Totales'),
        h(Text, { style: styles.colMonto }, money(totales.remunerativo)),
        h(Text, { style: styles.colMonto }, money(totales.no_remunerativo)),
        h(Text, { style: styles.colMonto }, money(totales.descuento)),
        h(Text, { style: styles.colMonto }, money(totales.sueldo_neto)),
        h(Text, { style: styles.colMonto }, money(totales.sueldo_bruto)))));
}

module.exports = { LibroDocument };
