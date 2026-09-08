import { useState, useEffect, useRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import * as api from '../../api/empresas';
import BotonVolver from '../../components/BotonVolver';
import './EmpresasPage.css';

const CATEGORIAS = [
  { clave: 'conceptos', label: 'Conceptos (fórmulas, aportes y asignaciones automáticas)' },
  { clave: 'formulariosRecibo', label: 'Diseño de Recibo' },
  { clave: 'formulariosLibro', label: 'Diseño de Libro' },
];
const INCLUIR_TODO = { conceptos: true, formulariosRecibo: true, formulariosLibro: true };

// Copia conceptos (fórmulas, aportes) y diseño de recibo/libro de una empresa a otra —
// para que una empresa nueva no arranque con todo vacío (ver memoria
// project_multiempresa_filtro_faltante: esas tablas son por-empresa, el resto de
// catálogos ya es global y no hace falta copiarlo). El usuario elige qué categorías
// copiar — por defecto las tres.
export default function CopiarConfiguracionPage() {
  const [empresas, setEmpresas] = useState([]);
  const [origenId, setOrigenId] = useState(null);
  const [destinoId, setDestinoId] = useState(null);
  const [incluir, setIncluir] = useState(INCLUIR_TODO);
  const [tieneConfig, setTieneConfig] = useState(null);
  const [checking, setChecking] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [modoDialogVisible, setModoDialogVisible] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    api.getEmpresas().then(res => setEmpresas(res.data.resultado)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!destinoId) { setTieneConfig(null); return; }
    setChecking(true);
    api.tieneConfiguracion(destinoId)
      .then(res => setTieneConfig(res.data.resultado.tieneConfiguracion))
      .catch(() => setTieneConfig(null))
      .finally(() => setChecking(false));
  }, [destinoId]);

  const origenOptions = empresas.filter(e => e.id !== destinoId).map(e => ({ label: e.razon_social, value: e.id }));
  const destinoOptions = empresas.filter(e => e.id !== origenId).map(e => ({ label: e.razon_social, value: e.id }));

  const categoriasSeleccionadas = CATEGORIAS.filter(c => incluir[c.clave]);
  const categoriasEnConflicto = tieneConfig
    ? categoriasSeleccionadas.filter(c => tieneConfig[c.clave])
    : [];

  function toggleCategoria(clave) {
    setIncluir(prev => ({ ...prev, [clave]: !prev[clave] }));
  }

  function handleCopiarClick() {
    if (!origenId || !destinoId) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí la empresa de origen y la de destino' });
      return;
    }
    if (!categoriasSeleccionadas.length) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí al menos una categoría para copiar' });
      return;
    }
    if (categoriasEnConflicto.length) {
      setModoDialogVisible(true);
    } else {
      ejecutarCopia('reemplazar');
    }
  }

  async function ejecutarCopia(modo) {
    setModoDialogVisible(false);
    setCopiando(true);
    try {
      await api.copiarConfiguracion(destinoId, origenId, modo, incluir);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Configuración copiada' });
      api.tieneConfiguracion(destinoId).then(res => setTieneConfig(res.data.resultado.tieneConfiguracion)).catch(() => {});
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo copiar la configuración';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setCopiando(false);
    }
  }

  return (
    <div className="page-empresas">
      <Toast ref={toast} />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-copy" /> Copiar Configuración</h2>
      </div>

      <p className="copiar-config-intro">
        Copia conceptos (fórmulas, aportes) y/o diseño de recibo/libro de una empresa hacia otra.
        No copia empleados, recibos ni ningún otro dato transaccional.
      </p>

      <div className="form-grid">
        <div className="form-field">
          <label>Empresa origen</label>
          <Dropdown
            value={origenId}
            options={origenOptions}
            onChange={e => setOrigenId(e.value)}
            placeholder="Seleccionar empresa de origen"
            filter
            showClear
            style={{ width: '320px' }}
          />
        </div>
        <div className="form-field">
          <label>Empresa destino</label>
          <Dropdown
            value={destinoId}
            options={destinoOptions}
            onChange={e => setDestinoId(e.value)}
            placeholder="Seleccionar empresa de destino"
            filter
            showClear
            style={{ width: '320px' }}
          />
        </div>
      </div>

      <div className="copiar-config-categorias">
        <label>Qué copiar</label>
        {CATEGORIAS.map(c => (
          <div className="form-field form-field--checkbox" key={c.clave}>
            <Checkbox inputId={c.clave} checked={incluir[c.clave]} onChange={() => toggleCategoria(c.clave)} />
            <label htmlFor={c.clave}>
              {c.label}
              {tieneConfig?.[c.clave] && <span className="copiar-config-badge">ya tiene datos</span>}
            </label>
          </div>
        ))}
      </div>

      {checking && <p className="copiar-config-status">Verificando configuración actual de la empresa destino…</p>}

      <div className="copiar-config-actions">
        <Button label="Copiar configuración" icon="fa-solid fa-copy" onClick={handleCopiarClick} loading={copiando} disabled={checking} />
      </div>

      <Dialog
        visible={modoDialogVisible}
        onHide={() => setModoDialogVisible(false)}
        header="Ya hay configuración cargada"
        style={{ width: '480px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <p>
          La empresa destino ya tiene {categoriasEnConflicto.map(c => c.label).join(', ')} cargado{categoriasEnConflicto.length > 1 ? 's' : ''}.
          ¿Cómo querés proceder con esas categorías?
        </p>
        <ul className="copiar-config-modo-lista">
          <li><strong>Reemplazar:</strong> borra la configuración actual del destino y la reemplaza por la del origen.</li>
          <li><strong>Combinar:</strong> agrega solo lo que falte, sin tocar lo que ya está cargado.</li>
        </ul>
        <div className="dialog-footer-btns mt-2">
          <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setModoDialogVisible(false)} disabled={copiando} />
          <Button label="Combinar" icon="fa-solid fa-object-ungroup" className="p-button-outlined" onClick={() => ejecutarCopia('combinar')} loading={copiando} />
          <Button label="Reemplazar" icon="fa-solid fa-triangle-exclamation" className="p-button-danger" onClick={() => ejecutarCopia('reemplazar')} loading={copiando} />
        </div>
      </Dialog>
    </div>
  );
}
