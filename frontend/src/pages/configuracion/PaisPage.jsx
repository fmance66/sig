import CatalogoPage from './CatalogoPage';

export default function PaisPage() {
  return (
    <CatalogoPage
      title="País"
      icon="fa-solid fa-flag"
      basePath="/paises"
      entityLabel="país"
      idLabel="Código"
      idSpan={3}
      deleteLabelField="pais"
      filterFields={['id', 'pais']}
      columns={[
        { field: 'id', header: 'Código', style: { width: '120px' } },
        { field: 'pais', header: 'País' },
      ]}
      fields={[
        { name: 'pais', label: 'País', required: true },
      ]}
    />
  );
}
