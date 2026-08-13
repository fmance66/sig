import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';

// Buscador global de las tablas: lupa fija a la derecha + "x" para vaciar
// el campo, visible solo cuando hay texto (mismo estilo que el "x" de un
// Dropdown con showClear).
//
// OJO: IconField de PrimeReact hace React.cloneElement sobre cada child sin
// filtrar null/''/false — no se puede omitir condicionalmente el ícono de
// "x" en el JSX (crashea apenas value es '', el estado inicial de cualquier
// filtro). Por eso se renderiza siempre y se oculta con CSS.
export default function BuscadorTabla({ value, onChange, placeholder = 'Buscar...', ...props }) {
  return (
    <IconField iconPosition="right" className="buscador-tabla">
      <InputIcon
        className={`fa-solid fa-xmark buscador-tabla-clear${value ? '' : ' buscador-tabla-clear--hidden'}`}
        onClick={value ? () => onChange('') : undefined}
      />
      <InputIcon className="fa-solid fa-magnifying-glass" />
      <InputText value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} {...props} />
    </IconField>
  );
}
