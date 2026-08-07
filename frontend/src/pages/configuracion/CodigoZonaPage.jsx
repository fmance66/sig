import CatalogoPage from './CatalogoPage';

export default function CodigoZonaPage() {
  return (
    <CatalogoPage
      title="Código de Zona"
      icon="fa-solid fa-landmark"
      basePath="/codigos-zona"
      entityLabel="código de zona"
      columns={[
        { field: 'id', header: 'Código', style: { width: '120px' } },
        { field: 'descripcion', header: 'Descripción' },
        { field: 'orden', header: 'Orden', style: { width: '100px' } },
      ]}
      fields={[
        { name: 'descripcion', label: 'Descripción', required: true, full: true },
        { name: 'orden', label: 'Orden', type: 'number' },
      ]}
    />
  );
}
