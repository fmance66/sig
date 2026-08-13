import CatalogoPage from '../../configuracion/CatalogoPage';

export default function FormulasPage() {
  return (
    <CatalogoPage
      title="Fórmulas"
      icon="fa-solid fa-flask"
      basePath="/formulas"
      entityLabel="fórmula"
      dialogWidth="650px"
      columns={[
        { field: 'id', header: 'Código', style: { width: '160px' } },
        { field: 'descripcion', header: 'Descripción' },
        { field: 'formato', header: 'Formato', style: { width: '160px' } },
      ]}
      fields={[
        { name: 'descripcion', label: 'Descripción', required: true, full: true },
        { name: 'formato', label: 'Formato' },
        { name: 'formula', label: 'Fórmula', type: 'textarea', full: true },
      ]}
    />
  );
}
