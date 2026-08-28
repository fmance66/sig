import { useEffect, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { getLiquidaciones } from '../api/liquidaciones';

// Selector de período: mismo contrato que un Dropdown de PrimeReact
// (value / onChange(e) con e.value), pero autocontenido — trae la lista de
// sld_liquidacion una sola vez y arma las opciones, en vez de que cada
// pantalla repita el fetch + el .map de "periodo — descripcion".
// sld_liquidacion es una tabla global (no tiene columna empresa), así que si
// se pasa `empresa` se acota a los períodos que tienen al menos un recibo de
// esa empresa — evita ofrecer períodos "vacíos" para la empresa seleccionada.
export default function PeriodoSelect({ value, onChange, empresa, placeholder = 'Seleccionar período', style, ...props }) {
  const [periodos, setPeriodos] = useState([]);

  useEffect(() => {
    getLiquidaciones({ empresa }).then(res => setPeriodos(res.data.resultado)).catch(() => {});
  }, [empresa]);

  // Más nuevo primero — se ordena por `fecha` (no por el texto de `periodo`, que
  // no siempre es comparable como string: mezcla formatos "MM/AAAA" y "1ra Quinc. MM/AAAA").
  const options = [...periodos]
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
    .map(l => ({ label: `${l.periodo} — ${l.descripcion || ''}`, value: l.periodo }));

  return (
    <Dropdown
      value={value || null}
      options={options}
      onChange={onChange}
      filter
      showClear
      placeholder={placeholder}
      style={style}
      panelClassName="periodo-select-panel"
      {...props}
    />
  );
}
