import { useState, useEffect, useRef } from 'react';
import { TreeTable } from 'primereact/treetable';
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

export default function PlanDeCuentasPage() {
  const { empresa } = useEmpresa();
  const [arbol, setArbol]       = useState([]);
  const [cuentas, setCuentas]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [cuentaEditando, setCuentaEditando] = useState(null);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id]);

  async function load() {
    setLoading(true);
    try {
      const [arbolRes, cuentasRes] = await Promise.all([
        api.getArbolCuentas(empresa.id),
        api.getCuentas(empresa.id),
      ]);
      setArbol(arbolRes.data.resultado);
      setCuentas(cuentasRes.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el plan de cuentas' });
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
      message: `¿Está seguro de eliminar la cuenta "${row.descripcion || row.id}"? Las cuentas hijas quedarán sin cuenta padre.`,
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

  const accionesTemplate = (node) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(node.data)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(node.data)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar cuenta" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  return (
    <div className="page-contabilidad">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-sitemap" /> Plan de Cuentas</h2>
      </div>

      <TreeTable
        value={arbol}
        loading={loading}
        globalFilter={globalFilter}
        header={tableHeader}
        emptyMessage="No hay cuentas registradas"
        size="small"
        stripedRows
        scrollable
        scrollHeight="65vh"
      >
        <Column field="id" header="Cuenta" expander style={{ width: '220px' }} body={node => node.data.id} />
        <Column field="descripcion" header="Descripción" body={node => node.data.descripcion} />
        <Column header="Saldo" style={{ width: '90px' }} body={node => node.data.saldo} />
        <Column header="Naturaleza" style={{ width: '120px' }} body={node => node.data.naturaleza} />
        <Column header="Imputable" style={{ width: '100px' }} body={node => SI_NO(node.data.imputable)} />
        <Column header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} body={accionesTemplate} />
      </TreeTable>

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
