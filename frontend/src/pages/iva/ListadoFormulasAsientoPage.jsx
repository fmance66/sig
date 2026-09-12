import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/formulaAsiento';
import * as cuentasApi from '../../api/cuentas';
import * as centrosCostoApi from '../../api/centrosCosto';
import * as proyectosApi from '../../api/proyectos';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import FormulaAsientoDialog, { GRUPO_LABELS } from './FormulaAsientoDialog';
import './iva.css';

export default function ListadoFormulasAsientoPage() {
  const { empresa } = useEmpresa();
  const [searchParams] = useSearchParams();
  const grupo = searchParams.get('grupo') || '';
  const [modelos, setModelos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [modeloEditando, setModeloEditando] = useState(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id, grupo]);
  useEffect(() => { setVisibleCount(modelos.length); }, [modelos]);

  async function load() {
    setLoading(true);
    try {
      const [modelosRes, cuentasRes, ccRes, pyRes] = await Promise.all([
        api.getModelos(empresa.id, grupo || undefined),
        cuentasApi.getCuentas(empresa.id),
        centrosCostoApi.getCentrosCosto(empresa.id),
        proyectosApi.getProyectos(),
      ]);
      setModelos(modelosRes.data.resultado);
      setCuentas(cuentasRes.data.resultado);
      setCentrosCosto(ccRes.data.resultado);
      setProyectos(pyRes.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el listado de fórmulas de asiento' });
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
      message: `¿Está seguro de eliminar la fórmula de asiento "${row.descripcion || row.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteModelo(row.id, empresa.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Fórmula de asiento eliminada' });
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
      <Button label="Agregar fórmula" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = modelos.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;
  const titulo = grupo && GRUPO_LABELS[grupo] ? `Fórmula de Asiento de ${GRUPO_LABELS[grupo]}` : 'Fórmulas de Asiento';

  return (
    <div className="page-iva">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-flask" /> {titulo}</h2>
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
        emptyMessage="No hay fórmulas de asiento registradas"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id" header="Modelo" sortable style={{ width: '160px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column field="leyenda" header="Leyenda" sortable />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <FormulaAsientoDialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSaved={handleSaved}
        empresa={empresa?.id}
        grupo={grupo}
        modelo={modeloEditando}
        cuentas={cuentas}
        centrosCosto={centrosCosto}
        proyectos={proyectos}
        toast={toast}
      />
    </div>
  );
}
