import CatalogoPage from '../../configuracion/CatalogoPage';

const TIPO_OPTIONS = [
  { label: 'Voluntario', value: 'VOLUNTARIO' },
  { label: 'Involuntario', value: 'INVOLUNTARIO' },
];

export default function MotivoAusentismoPage() {
  return (
    <CatalogoPage
      title="Motivos de Ausentismo"
      icon="fa-solid fa-file-circle-exclamation"
      basePath="/motivos-ausentismo"
      entityLabel="motivo de ausentismo"
      idLabel="Motivo de Ausentismo"
      columns={[
        { field: 'id', header: 'Motivo', style: { width: '160px' } },
        { field: 'tipo', header: 'Tipo', style: { width: '130px' } },
        { field: 'descripcion', header: 'Descripción' },
        { field: 'simbolo', header: 'Símbolo', style: { width: '100px' } },
        { field: 'orden', header: 'Orden', style: { width: '90px' } },
      ]}
      fields={[
        { name: 'tipo', label: 'Tipo de Ausentismo', type: 'select', options: TIPO_OPTIONS, full: true },
        { name: 'descripcion', label: 'Descripción', required: true, full: true },
        { name: 'simbolo', label: 'Símbolo' },
        { name: 'orden', label: 'Orden', type: 'number' },
      ]}
    />
  );
}
