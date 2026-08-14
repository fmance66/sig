import CatalogoPage from '../../configuracion/CatalogoPage';

const DATA_TYPE_OPTIONS = [
  { label: 'Texto', value: 'TEXT' },
  { label: 'Entero', value: 'INTEGER' },
  { label: 'Decimal', value: 'DECIMAL' },
  { label: 'Fecha', value: 'DATE' },
];

export default function CampoHistorialPage() {
  return (
    <CatalogoPage
      title="Campo de Historial"
      icon="fa-solid fa-clock-rotate-left"
      basePath="/campos-historial"
      entityLabel="campo de historial"
      idLabel="Campo"
      idSpan={4}
      filterFields={['id', 'descripcion']}
      columns={[
        { field: 'id', header: 'Campo', style: { width: '160px' } },
        { field: 'descripcion', header: 'Descripción' },
        { field: 'data_type', header: 'Tipo de Datos', style: { width: '120px' } },
        { field: 'length', header: 'Longitud', style: { width: '100px' } },
        { field: 'decimals', header: 'Decimales', style: { width: '100px' } },
        { field: 'orden', header: 'Orden', style: { width: '90px' } },
      ]}
      fields={[
        { name: 'descripcion', label: 'Descripción', required: true },
        { name: 'data_type', label: 'Tipo de Datos', type: 'select', options: DATA_TYPE_OPTIONS },
        { name: 'length', label: 'Longitud', type: 'number' },
        { name: 'decimals', label: 'Decimales', type: 'number' },
        { name: 'orden', label: 'Orden', type: 'number' },
      ]}
    />
  );
}
