import { Button } from 'primereact/button';
import FiltroTexto from '../liquidaciones/FiltroTexto';
import PeriodoSelect from '../../../components/PeriodoSelect';
import { useEmpresa } from '../../../context/EmpresaContext';

// Panel de filtro compartido por las pantallas de Informes: mismo set de
// campos que ya filtra recibos.list() en el backend (período/legajo/
// convenio/categoría/grupo/estado). El campo extra de cada informe
// (Agrupado por, Concepto, etc.) se pasa como children y se renderiza
// antes de los botones.
export default function InformeFiltro({
  filtro, onChange, onBuscar, onLimpiar, loading, children, actions, ocultar = [], periodoDropdown = false,
}) {
  const { empresa } = useEmpresa();

  function handleChange(e) {
    const { name, value } = e.target;
    onChange(prev => ({ ...prev, [name]: value }));
  }

  const oculto = campo => ocultar.includes(campo);

  return (
    <>
    <div className="informe-filtro">
      {!oculto('periodo') && (
        <div className="form-field">
          <label>Período</label>
          {periodoDropdown
            ? (
              <PeriodoSelect
                value={filtro.periodo}
                onChange={e => onChange(prev => ({ ...prev, periodo: e.value || '' }))}
                empresa={empresa?.id}
                placeholder=""
                style={{ width: '220px' }}
              />
            )
            : <FiltroTexto name="periodo" value={filtro.periodo} onChange={handleChange} />}
        </div>
      )}
      <div className="form-field">
        <label>Legajo</label>
        <FiltroTexto name="legajo" value={filtro.legajo} onChange={handleChange} />
      </div>
      <div className="form-field">
        <label>Convenio</label>
        <FiltroTexto name="convenio" value={filtro.convenio} onChange={handleChange} />
      </div>
      <div className="form-field">
        <label>Categoría</label>
        <FiltroTexto name="categoria" value={filtro.categoria} onChange={handleChange} />
      </div>
      <div className="form-field">
        <label>Grupo</label>
        <FiltroTexto name="grupo" value={filtro.grupo} onChange={handleChange} />
      </div>
      {!oculto('estado') && (
        <div className="form-field">
          <label>Estado</label>
          <FiltroTexto name="estado" value={filtro.estado} onChange={handleChange} />
        </div>
      )}
      {children}
      <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={onBuscar} loading={loading} />
      <Button label="Limpiar" icon="fa-solid fa-eraser" size="small" className="p-button-outlined" onClick={onLimpiar} />
    </div>
    {actions && <div className="informe-filtro-acciones">{actions}</div>}
    </>
  );
}

export const FILTRO_VACIO = { periodo: '', legajo: '', convenio: '', categoria: '', grupo: '', estado: '' };
