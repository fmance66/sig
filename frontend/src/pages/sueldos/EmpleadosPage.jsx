import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { useEmpresa } from '../../context/EmpresaContext';
import * as api from '../../api/empleados';
import './EmpleadosPage.css';

const ESTADO_MAP = {
  a: { severity: 'success', label: 'Activo' },
  activo: { severity: 'success', label: 'Activo' },
  i: { severity: 'danger', label: 'Inactivo' },
  inactivo: { severity: 'danger', label: 'Inactivo' },
  s: { severity: 'warning', label: 'Suspendido' },
  suspendido: { severity: 'warning', label: 'Suspendido' },
  l: { severity: 'info', label: 'Licencia' },
  licencia: { severity: 'info', label: 'Licencia' },
};

export default function EmpleadosPage() {
  const { empresa } = useEmpresa();
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getEmpleados(empresa.id);
      setEmpleados(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los empleados' });
    } finally {
      setLoading(false);
    }
  }

  function handleDelete(emp) {
    confirmDialog({
      message: `¿Está seguro de eliminar a "${emp.apellido}, ${emp.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteEmpleado(emp.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Empleado eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el empleado' });
        }
      },
    });
  }

  function nombreTemplate(row) {
    return `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;
  }

  function estadoTemplate(row) {
    const key = row.estado?.toLowerCase();
    const { severity, label } = ESTADO_MAP[key] ?? { severity: 'secondary', label: row.estado ?? '—' };
    return <Tag severity={severity} value={label} className="estado-tag" />;
  }

  function fechaTemplate(row) {
    if (!row.fecha_ingreso) return '—';
    return new Date(row.fecha_ingreso).toLocaleDateString('es-AR');
  }

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button
        icon="fa-solid fa-pen"
        className="p-button-text p-button-sm"
        tooltip="Modificar"
        tooltipOptions={{ position: 'top' }}
      />
      <Button
        icon="fa-solid fa-trash"
        className="p-button-text p-button-sm p-button-danger"
        tooltip="Eliminar"
        tooltipOptions={{ position: 'top' }}
        onClick={() => handleDelete(row)}
      />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <IconField iconPosition="left">
        <InputIcon className="fa-solid fa-magnifying-glass" />
        <InputText
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder="Buscar..."
        />
      </IconField>
      <Button label="Agregar empleado" icon="fa-solid fa-plus" size="small" />
    </div>
  );

  const paginatorRight = (
    <span className="total-registros">Total: {empleados.length} registros</span>
  );

  return (
    <div className="page-empleados">
      <Toast ref={toast} />
      <ConfirmDialog />

      <DataTable
        value={empleados}
        loading={loading}
        paginator={empleados.length > 10}
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        paginatorRight={paginatorRight}
        globalFilter={globalFilter}
        globalFilterFields={['apellido', 'nombre', 'cuil', 'convenio', 'categoria']}
        header={tableHeader}
        emptyMessage="No hay empleados registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id"       header="Legajo"           sortable style={{ width: '80px' }} />
        <Column body={nombreTemplate}  header="Apellido y Nombre" sortField="apellido" sortable />
        <Column field="cuil"     header="CUIL"             sortable style={{ width: '140px' }} />
        <Column body={estadoTemplate}  header="Estado"     sortField="estado" sortable style={{ width: '100px', textAlign: 'center' }} />
        <Column body={fechaTemplate}   header="Ingreso"    sortField="fecha_ingreso" sortable style={{ width: '100px' }} />
        <Column field="convenio" header="Convenio"         sortable style={{ width: '130px' }} />
        <Column field="categoria" header="Categoría"       sortable style={{ width: '100px' }} />
        <Column body={accionesTemplate} header="Acciones"  style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>
    </div>
  );
}
