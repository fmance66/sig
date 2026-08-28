import { useState, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import * as api from '../../../api/liquidaciones';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = v => v ? new Date(v).toLocaleDateString('es-AR') : '—';
const rowId = r => `${r.periodo}|${r.empleado}|${r.numero}`;

// Tabla de recibos con expansión perezosa a sus líneas de concepto (misma
// lógica que RecibosPage.jsx), reusada por Recibos Agrupados por Período y
// por Empleado — en ambas pantallas, el nivel más interno es siempre
// "recibos de esta agrupación, expandibles a sus conceptos".
// selection/onSelectionChange son opcionales: si vienen, se agrega la columna de
// checkboxes (con "seleccionar todos" en el header) — la usan Recibos/Libro de
// Sueldo para elegir qué imprimir; los Agrupados no la necesitan y no la pasan.
export default function RecibosConceptosTable({ recibos, selection, onSelectionChange, mostrarTotal = false }) {
  const rows = useMemo(() => recibos.map(r => ({ ...r, _id: rowId(r) })), [recibos]);
  // El padre puede setear la selección por defecto con los recibos "crudos" (sin _id,
  // que es un campo interno de esta tabla) — se normaliza acá para que el dataKey matchee.
  const normalizedSelection = useMemo(() => selection?.map(r => ({ ...r, _id: rowId(r) })), [selection]);
  const [expandedRows, setExpandedRows] = useState(null);
  const [conceptosPorRecibo, setConceptosPorRecibo] = useState({});

  async function onRowToggle(e) {
    setExpandedRows(e.data);
    const nuevos = Object.keys(e.data).filter(id => !(id in conceptosPorRecibo));
    for (const id of nuevos) {
      const row = rows.find(r => r._id === id);
      if (!row) continue;
      try {
        const res = await api.getConceptosRecibo(row.periodo, row.empleado, row.numero);
        setConceptosPorRecibo(prev => ({ ...prev, [id]: res.data.resultado }));
      } catch {
        setConceptosPorRecibo(prev => ({ ...prev, [id]: [] }));
      }
    }
  }

  function detalleTemplate(row) {
    const conceptos = conceptosPorRecibo[row._id] ?? [];
    return (
      <div className="row-expansion">
        <DataTable value={conceptos} size="small" stripedRows emptyMessage="Este recibo no tiene conceptos cargados">
          <Column field="concepto" header="Concepto" style={{ width: '90px' }} />
          <Column field="concepto_desc" header="Descripción" />
          <Column field="columna" header="Columna" style={{ width: '150px' }} />
          <Column field="unidad" header="Unidad" style={{ width: '90px' }} />
          <Column body={c => money(c.importe)} header="Importe" style={{ width: '120px' }} />
        </DataTable>
      </div>
    );
  }

  const nombreTemplate = row => `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;

  const tableFooter = mostrarTotal && rows.length > 0
    ? <div className="table-footer-right"><span className="total-registros">Total: {rows.length} registros</span></div>
    : null;

  return (
    <DataTable
      value={rows}
      size="small"
      stripedRows
      expandedRows={expandedRows}
      onRowToggle={onRowToggle}
      rowExpansionTemplate={detalleTemplate}
      dataKey="_id"
      emptyMessage="Sin recibos"
      selection={normalizedSelection}
      onSelectionChange={onSelectionChange}
      footer={tableFooter}
    >
      {onSelectionChange && <Column selectionMode="multiple" style={{ width: '3rem' }} />}
      <Column expander style={{ width: '3rem' }} />
      <Column field="legajo" header="Legajo" style={{ width: '90px' }} />
      <Column body={nombreTemplate} header="Apellido y Nombre" />
      <Column field="periodo" header="Período" style={{ width: '100px' }} />
      <Column body={r => fecha(r.fecha_recibo)} header="Fecha" style={{ width: '100px' }} />
      <Column body={r => money(r.remunerativo)} header="Remunerativo" style={{ width: '120px' }} />
      <Column body={r => money(r.no_remunerativo)} header="No Remunerativo" style={{ width: '130px' }} />
      <Column body={r => money(r.descuento)} header="Descuento" style={{ width: '110px' }} />
      <Column body={r => money(r.sueldo_neto)} header="Sueldo Neto" style={{ width: '120px' }} />
      <Column body={r => money(r.sueldo_bruto)} header="Sueldo Bruto" style={{ width: '120px' }} />
    </DataTable>
  );
}
