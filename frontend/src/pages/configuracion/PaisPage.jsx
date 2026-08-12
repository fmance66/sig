import CatalogoPage from './CatalogoPage';

export default function PaisPage() {
  return (
    <CatalogoPage
      title="País"
      icon="fa-solid fa-flag"
      basePath="/paises"
      entityLabel="país"
      idLabel="País"
      filterFields={['id']}
      columns={[
        { field: 'id', header: 'País' },
        { field: 'codigo', header: 'Código', style: { width: '120px' } },
      ]}
      fields={[
        { name: 'codigo', label: 'Código' },
      ]}
    />
  );
}
