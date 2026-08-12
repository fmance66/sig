import CatalogoPage from './CatalogoPage';

export default function LocalidadPage() {
  return (
    <CatalogoPage
      title="Localidad"
      icon="fa-solid fa-location-dot"
      basePath="/localidades"
      entityLabel="localidad"
      idLabel="Localidad"
      filterFields={['id', 'provincia']}
      columns={[
        { field: 'id', header: 'Localidad', style: { width: '220px' } },
        { field: 'provincia', header: 'Provincia' },
        { field: 'zona', header: 'Zona' },
        { field: 'cpa', header: 'CPA', style: { width: '120px' } },
      ]}
      fields={[
        { name: 'provincia', label: 'Provincia' },
        { name: 'zona', label: 'Zona' },
        { name: 'cpa', label: 'CPA' },
      ]}
    />
  );
}
