import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/ivaPersonas';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import PersonaDialog from './PersonaDialog';
import './iva.css';

// Compartido por "Proveedor"/"Listado de Proveedores" (modulo COMPRA) y
// "Cliente"/"Listado de Clientes" (modulo VENTA) — mismo componente, textos
// derivados de `modulo`. Listas acotadas (~250 filas por empresa), filtro
// de texto client-side alcanza sin necesidad de filtro server-side.
export default function ListadoPersonasPage({ modulo }) {
  const { empresa } = useEmpresa();
  const etiqueta = modulo === 'VENTA' ? 'Cliente' : 'Proveedor';
  const etiquetaPlural = modulo === 'VENTA' ? 'Clientes' : 'Proveedores';
  const icono = modulo === 'VENTA' ? 'fa-user-tie' : 'fa-truck-field';
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id, modulo]);
  useEffect(() => { setVisibleCount(registros.length); }, [registros]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getPersonas(modulo, empresa.id);
      setRegistros(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: `No se pudo cargar el listado de ${etiquetaPlural.toLowerCase()}` });
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
      message: `¿Está seguro de eliminar ${modulo === 'VENTA' ? 'al cliente' : 'al proveedor'} "${row.razon_social}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deletePersona(modulo, row.id, empresa.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: `${etiqueta} eliminado` });
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
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} placeholder="Buscar por razón social..." />
      <Button label={`Agregar ${etiqueta.toLowerCase()}`} icon="fa-solid fa-plus" size="small" onClick={openNew} />
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
        <h2 className="page-title"><i className={`fa-solid ${icono}`} /> {etiquetaPlural}</h2>
      </div>

      <DataTable
        value={registros}
        loading={loading}
        paginator={hasPaginator}
        rows={15}
        rowsPerPageOptions={[15, 25, 50, 100]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['razon_social', 'nombre_comercial', 'numero_documento']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        emptyMessage={`No hay ${etiquetaPlural.toLowerCase()} registrados`}
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id" header="Código" sortable style={{ width: '90px' }} />
        <Column field="razon_social" header="Razón Social" sortable />
        <Column field="tipo_documento" header="Tipo Doc." style={{ width: '110px' }} />
        <Column field="numero_documento" header="Número Doc." style={{ width: '140px' }} />
        <Column field="condicion_iva" header="Condición IVA" style={{ width: '170px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <PersonaDialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSaved={handleSaved}
        empresa={empresa?.id}
        modulo={modulo}
        persona={editando}
        toast={toast}
      />
    </div>
  );
}
