import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/ivaItems';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import ItemDialog from './ItemDialog';
import './iva.css';

const SI_NO = v => v ? 'Sí' : 'No';

// Compartido por "Ítem de Compra"/"Listado de Ítems de Compra" (modulo COMPRA)
// e "Ítem de Venta"/"Listado de Ítems de Venta" (modulo VENTA). OJO: iva_item
// no tiene datos reales migrados en ninguna de las 6 empresas — la pantalla
// funciona pero no va a mostrar contenido contra datos reales todavía.
export default function ListadoItemsPage({ modulo }) {
  const { empresa } = useEmpresa();
  const etiqueta = modulo === 'VENTA' ? 'ítem de venta' : 'ítem de compra';
  const etiquetaTitulo = modulo === 'VENTA' ? 'Ítems de Venta' : 'Ítems de Compra';
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id, modulo]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getItems(modulo, empresa.id);
      setRegistros(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: `No se pudo cargar el listado de ${etiquetaTitulo.toLowerCase()}` });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditando(null);
    setDialogVisible(true);
  }

  function openEdit(row) {
    setEditando(row);
    setDialogVisible(true);
  }

  function handleSaved() {
    setDialogVisible(false);
    load();
  }

  function handleDelete(row) {
    confirmDialog({
      message: `¿Está seguro de eliminar el ${etiqueta} "${row.descripcion}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteItem(modulo, row.id, empresa.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Ítem eliminado' });
          load();
        } catch (err) {
          const msg = err.response?.data?.mensaje || 'No se pudo eliminar';
          toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
        }
      },
    });
  }

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label={`Agregar ${etiqueta}`} icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = registros.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;

  return (
    <div className="page-iva">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-box" /> {etiquetaTitulo}</h2>
      </div>

      <DataTable
        value={registros}
        loading={loading}
        paginator={hasPaginator}
        rows={15}
        rowsPerPageOptions={[15, 25, 50, 100]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['descripcion', 'grupo']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        emptyMessage={`No hay ${etiquetaTitulo.toLowerCase()} registrados`}
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id" header="Código" sortable style={{ width: '90px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column field="grupo" header="Grupo" style={{ width: '140px' }} />
        <Column field="unidad" header="Unidad" style={{ width: '100px' }} />
        <Column body={r => r.alicuota != null ? `${r.alicuota}%` : '—'} header="Alícuota" style={{ width: '100px' }} />
        <Column body={r => SI_NO(r.calcular)} header="Calcular" style={{ width: '100px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <ItemDialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSaved={handleSaved}
        empresa={empresa?.id}
        modulo={modulo}
        item={editando}
        toast={toast}
      />
    </div>
  );
}
