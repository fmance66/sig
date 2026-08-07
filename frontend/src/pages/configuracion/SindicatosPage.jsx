import CatalogoPage from './CatalogoPage';

export default function SindicatosPage() {
  return (
    <CatalogoPage
      title="Sindicatos"
      icon="fa-solid fa-people-group"
      basePath="/sindicatos"
      entityLabel="sindicato"
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
