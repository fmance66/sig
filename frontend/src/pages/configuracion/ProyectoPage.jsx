import CatalogoPage from './CatalogoPage';

export default function ProyectoPage() {
  return (
    <CatalogoPage
      title="Proyectos"
      icon="fa-solid fa-diagram-project"
      basePath="/proyectos"
      entityLabel="proyecto"
      dialogWidth="720px"
      columns={[
        { field: 'id', header: 'Código', style: { width: '110px' } },
        { field: 'descripcion', header: 'Descripción' },
        { field: 'grupo', header: 'Grupo', style: { width: '140px' } },
        { field: 'moneda', header: 'Moneda', style: { width: '90px' } },
        { field: 'avance', header: 'Avance %', style: { width: '100px' } },
        { field: 'orden', header: 'Orden', style: { width: '90px' } },
      ]}
      fields={[
        { name: 'descripcion', label: 'Descripción', required: true, full: true },
        { name: 'grupo', label: 'Grupo' },
        { name: 'alias', label: 'Alias' },
        { name: 'fecha', label: 'Fecha inicio', type: 'date' },
        { name: 'fecha_fin', label: 'Fecha fin', type: 'date' },
        { name: 'horas', label: 'Horas', type: 'number' },
        { name: 'valor_hora', label: 'Valor hora', type: 'number' },
        { name: 'presupuesto', label: 'Presupuesto', type: 'number' },
        { name: 'ejecutado', label: 'Ejecutado', type: 'number' },
        { name: 'avance', label: 'Avance (%)', type: 'number' },
        { name: 'moneda', label: 'Moneda (código)' },
        { name: 'id_padre', label: 'Proyecto padre (código)' },
        { name: 'color', label: 'Color' },
        { name: 'orden', label: 'Orden', type: 'number' },
        { name: 'visible', label: 'Visible', type: 'checkbox', default: true },
        { name: 'observaciones', label: 'Observaciones', type: 'textarea', full: true },
      ]}
    />
  );
}
