import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';

// InputText de filtro con una "x" a la derecha para vaciar el campo,
// visible solo cuando tiene contenido. Dispara el mismo shape de evento
// que un onChange nativo (e.target.name/value) para reusar los handlers
// existentes de cada toolbar de filtros.
export default function FiltroTexto({ name, value, onChange, ...props }) {
  function clear() {
    onChange({ target: { name, value: '' } });
  }

  // OJO: PrimeReact's IconField hace React.cloneElement sobre cada child sin
  // filtrar null/'' — no se puede omitir condicionalmente el ícono en el JSX
  // (crashea). Por eso siempre se renderiza y se oculta con CSS/pointer-events
  // cuando no hay nada que borrar.
  return (
    <IconField iconPosition="right" className="filtro-texto">
      <InputText name={name} value={value} onChange={onChange} {...props} />
      <InputIcon
        className={`fa-solid fa-xmark filtro-texto-clear${value ? '' : ' filtro-texto-clear--hidden'}`}
        onClick={value ? clear : undefined}
      />
    </IconField>
  );
}
