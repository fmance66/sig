import CatalogoPage from './CatalogoPage';

export default function ObrasSocialesPage() {
  return (
    <CatalogoPage
      title="Obras Sociales"
      icon="fa-solid fa-heart-pulse"
      basePath="/obras-sociales"
      entityLabel="obra social"
      dialogWidth="650px"
      columns={[
        { field: 'id', header: 'Código', style: { width: '140px' } },
        { field: 'descripcion', header: 'Descripción' },
        { field: 'aporte_porcentaje', header: 'Aporte %', style: { width: '110px' } },
        { field: 'retencion_porcentaje', header: 'Retención %', style: { width: '120px' } },
      ]}
      fields={[
        { name: 'descripcion', label: 'Descripción', required: true, full: true },
        { name: 'aporte_porcentaje', label: 'Aporte %', type: 'number' },
        { name: 'aporte_importe', label: 'Aporte Importe', type: 'number' },
        { name: 'retencion_porcentaje', label: 'Retención %', type: 'number' },
        { name: 'retencion_importe', label: 'Retención Importe', type: 'number' },
        { name: 'orden', label: 'Orden', type: 'number' },
      ]}
    />
  );
}
