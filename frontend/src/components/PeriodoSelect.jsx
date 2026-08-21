import { useEffect, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { getLiquidaciones } from '../api/liquidaciones';

// Selector de período: mismo contrato que un Dropdown de PrimeReact
// (value / onChange(e) con e.value), pero autocontenido — trae la lista de
// sld_liquidacion una sola vez y arma las opciones, en vez de que cada
// pantalla repita el fetch + el .map de "periodo — descripcion".
export default function PeriodoSelect({ value, onChange, placeholder = 'Seleccionar período', style, ...props }) {
  const [periodos, setPeriodos] = useState([]);

  useEffect(() => {
    getLiquidaciones().then(res => setPeriodos(res.data.resultado)).catch(() => {});
  }, []);

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
