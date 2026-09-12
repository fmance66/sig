import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/cuentas';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import CuentaDialog from './CuentaDialog';
import './contabilidad.css';

const SI_NO = (v) => v ? 'Sí' : 'No';

export default function ListadoCuentasPage() {
  const { empresa } = useEmpresa();
  const [cuentas, setCuentas]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [cuentaEditando, setCuentaEditando] = useState(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id]);
  useEffect(() => { setVisibleCount(cuentas.length); }, [cuentas]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getCuentas(empresa.id);
      setCuentas(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el listado de cuentas' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setCuentaEditando(null);
    setDialogVisible(true);
  }

  function openEdit(row) {
    setCuentaEditando(row);
    setDialogVisible(true);
  }

  function handleSaved() {
    setDialogVisible(false);
    load();
  }

  function handleDelete(row) {
    confirmDialog({
      message: `¿Está seguro de eliminar la cuenta "${row.descripcion || row.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteCuenta(row.id, empresa.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Cuenta eliminada' });
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
      <Button label="Agregar cuenta" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = cuentas.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;

  return (
    <div className="page-contabilidad">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-list" /> Listado de Cuentas</h2>
      </div>

      <DataTable
        value={cuentas}
        loading={loading}
        paginator={hasPaginator}
        rows={15}
        rowsPerPageOptions={[15, 25, 50, 100]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['id', 'descripcion']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        emptyMessage="No hay cuentas registradas"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id" header="Cuenta" sortable style={{ width: '140px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column field="saldo" header="Saldo" sortable style={{ width: '90px' }} />
        <Column field="naturaleza" header="Naturaleza" sortable style={{ width: '120px' }} />
        <Column field="imputable" header="Imputable" sortable style={{ width: '100px' }} body={row => SI_NO(row.imputable)} />
        <Column field="monetaria" header="Monetaria" sortable style={{ width: '100px' }} body={row => SI_NO(row.monetaria)} />
        <Column field="id_padre" header="Cuenta Padre" sortable style={{ width: '130px' }} />
        <Column field="orden" header="Orden" sortable style={{ width: '90px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <CuentaDialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSaved={handleSaved}
        empresa={empresa?.id}
        cuenta={cuentaEditando}
        cuentas={cuentas}
        toast={toast}
      />
    </div>
  );
}
