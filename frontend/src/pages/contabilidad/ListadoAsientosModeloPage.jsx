import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/asientoModelo';
import * as cuentasApi from '../../api/cuentas';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import AsientoModeloDialog from './AsientoModeloDialog';
import './contabilidad.css';

export default function ListadoAsientosModeloPage() {
  const { empresa } = useEmpresa();
  const [modelos, setModelos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [modeloEditando, setModeloEditando] = useState(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id]);
  useEffect(() => { setVisibleCount(modelos.length); }, [modelos]);

  async function load() {
    setLoading(true);
    try {
      const [modelosRes, cuentasRes] = await Promise.all([
        api.getModelos(empresa.id),
        cuentasApi.getCuentas(empresa.id),
      ]);
      setModelos(modelosRes.data.resultado);
      setCuentas(cuentasRes.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el listado de asientos modelo' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setModeloEditando(null);
    setDialogVisible(true);
  }

  function openEdit(row) {
    setModeloEditando(row);
    setDialogVisible(true);
  }

  function handleSaved() {
    setDialogVisible(false);
    load();
  }

  function handleDelete(row) {
    confirmDialog({
      message: `¿Está seguro de eliminar el asiento modelo "${row.descripcion || row.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteModelo(row.id, empresa.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Asiento modelo eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
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
      <Button label="Agregar modelo" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = modelos.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;

  return (
    <div className="page-contabilidad">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-copy" /> Asientos Modelo</h2>
      </div>

      <DataTable
        value={modelos}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['id', 'descripcion']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        emptyMessage="No hay asientos modelo registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id" header="Modelo" sortable style={{ width: '140px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column field="leyenda" header="Leyenda" sortable />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <AsientoModeloDialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSaved={handleSaved}
        empresa={empresa?.id}
        modelo={modeloEditando}
        cuentas={cuentas}
        toast={toast}
      />
    </div>
  );
}
