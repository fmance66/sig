import CatalogoPage from './CatalogoPage';

export default function MonedaPage() {
  return (
    <CatalogoPage
      title="Moneda"
      icon="fa-solid fa-coins"
      basePath="/monedas"
      entityLabel="moneda"
      filterFields={['id', 'nombre']}
      columns={[
        { field: 'id', header: 'Código', style: { width: '100px' } },
        { field: 'nombre', header: 'Nombre' },
        { field: 'simbolo', header: 'Símbolo', style: { width: '100px' } },
        { field: 'cotizacion', header: 'Cotización', style: { width: '120px' } },
        { field: 'orden', header: 'Orden', style: { width: '100px' } },
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true, full: true },
        { name: 'simbolo', label: 'Símbolo' },
        { name: 'simbolos', label: 'Símbolos (plural)' },
        { name: 'cotizacion', label: 'Cotización', type: 'number' },
        { name: 'color', label: 'Color' },
        { name: 'icono', label: 'Ícono' },
        { name: 'orden', label: 'Orden', type: 'number' },
      ]}
    />
  );
}
