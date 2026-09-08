import { useEffect, useRef, useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import * as api from '../../../api/lsd';
import BotonVolver from '../../../components/BotonVolver';
import './LsdTopesPage.css';

function pad(n) { return String(n).padStart(2, '0'); }
function periodoDe(fecha) { return `${fecha.getFullYear()}${pad(fecha.getMonth() + 1)}`; }
function fechaDe(periodo) { return new Date(Number(periodo.slice(0, 4)), Number(periodo.slice(4, 6)) - 1, 1); }

// Tope previsional mensual (ANSES, art. 9° Ley 24.241) usado para topear las
// bases imponibles de aportes del Libro de Sueldos Digital (Guía Nº 31 LSD de
// ARCA). No hay valor único fijo: cambia todos los meses. Se intenta
// autocompletar por scraping de una fuente pública (nunca se guarda solo) y
// siempre queda editable antes de guardar — ver services/topePrevisionalScraper.js.
export default function LsdTopesPage() {
  const [fecha, setFecha] = useState(new Date());
  const [minimo, setMinimo] = useState(null);
  const [maximo, setMaximo] = useState(null);
  const [origen, setOrigen] = useState(null); // 'SCRAPE' | 'MANUAL' | null
  const [guardado, setGuardado] = useState(false);
  const [editado, setEditado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const toast = useRef(null);

  const periodo = periodoDe(fecha);

  useEffect(() => { cargar(periodo); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodo]);

  async function cargar(p) {
    setCargando(true);
    setEditado(false);
    try {
      const res = await api.getTope(p);
      const r = res.data.resultado;
      setMinimo(r.minimo);
      setMaximo(r.maximo);
      setOrigen(r.origen);
      setGuardado(r.guardado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo consultar el tope del período' });
    } finally {
      setCargando(false);
    }
  }

  async function guardar() {
    if (minimo == null || maximo == null) return;
    setGuardando(true);
    try {
      const res = await api.guardarTope(periodo, { minimo, maximo, origen: editado ? 'MANUAL' : (origen ?? 'MANUAL') });
      const r = res.data.resultado;
      setOrigen(r.origen);
      setGuardado(true);
      setEditado(false);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Tope guardado' });
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el tope' });
    } finally {
      setGuardando(false);
    }
  }

  function estado() {
    if (cargando) return null;
    if (guardado) return <Tag severity="success" value={origen === 'SCRAPE' ? 'Guardado (obtenido automáticamente)' : 'Guardado (carga manual)'} />;
    if (origen === 'SCRAPE') return <Tag severity="info" value="Obtenido automáticamente — revisar antes de guardar" />;
    return <Tag severity="warning" value="Sin datos — cargar a mano" />;
  }

  return (
    <div className="page-lsd-topes">
      <Toast ref={toast} />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-gauge-high" /> Topes Previsionales (LSD)</h2>
      </div>

      <div className="lsd-card">
        <p className="lsd-card-desc">
          Tope de base imponible de aportes (SIPA/INSSJyP/Obra Social+FSR) vigente para el período,
          fijado mensualmente por ANSES. Se intenta autocompletar de una fuente pública — siempre
          revisable y editable antes de guardar.
        </p>

        <div className="lsd-topes-form">
          <div className="form-field">
            <label>Período</label>
            <Calendar value={fecha} onChange={e => setFecha(e.value)} view="month" dateFormat="mm/yy" showIcon />
          </div>

          <div className="form-field">
            <label>Base imponible mínima</label>
            <InputNumber
              value={minimo}
              onValueChange={e => { setMinimo(e.value); setEditado(true); }}
              mode="decimal" locale="es-AR" minFractionDigits={2} maxFractionDigits={2}
              disabled={cargando}
            />
          </div>

          <div className="form-field">
            <label>Base imponible máxima</label>
            <InputNumber
              value={maximo}
              onValueChange={e => { setMaximo(e.value); setEditado(true); }}
              mode="decimal" locale="es-AR" minFractionDigits={2} maxFractionDigits={2}
              disabled={cargando}
            />
          </div>

          <div className="lsd-topes-estado">{estado()}</div>

          <Button
            label="Guardar"
            icon="fa-solid fa-floppy-disk"
            onClick={guardar}
            loading={guardando}
            disabled={cargando || minimo == null || maximo == null}
          />
        </div>
      </div>
    </div>
  );
}
