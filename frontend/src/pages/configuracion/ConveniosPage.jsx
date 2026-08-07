import CatalogoPage from './CatalogoPage';

export default function ConveniosPage() {
  return (
    <CatalogoPage
      title="Convenios"
      icon="fa-solid fa-file-contract"
      basePath="/convenios"
      entityLabel="convenio"
      dialogWidth="650px"
      columns={[
        { field: 'id', header: 'Código', style: { width: '140px' } },
        { field: 'descripcion', header: 'Descripción' },
        { field: 'liquidacion', header: 'Liquidación', style: { width: '130px' } },
        { field: 'dias', header: 'Días', style: { width: '90px' } },
        { field: 'horas', header: 'Horas', style: { width: '90px' } },
      ]}
      fields={[
        { name: 'descripcion', label: 'Descripción', required: true, full: true },
        {
          name: 'liquidacion', label: 'Liquidación', type: 'select', options: [
            { label: 'Mensual', value: 'MENSUAL' },
            { label: 'Jornal', value: 'JORNAL' },
          ],
        },
        { name: 'dias', label: 'Días', type: 'number' },
        { name: 'horas', label: 'Horas', type: 'number' },
        { name: 'moneda', label: 'Moneda' },
        { name: 'obra_social', label: 'Obra Social' },
        { name: 'grupo_de_conceptos', label: 'Grupo de Conceptos' },
        { name: 'orden', label: 'Orden', type: 'number' },
      ]}
    />
  );
}
