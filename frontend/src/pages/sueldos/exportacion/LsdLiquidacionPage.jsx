import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useEmpresa } from '../../../context/EmpresaContext';
import PeriodoSelect from '../../../components/PeriodoSelect';
import * as api from '../../../api/lsd';
import BotonVolver from '../../../components/BotonVolver';
import './LsdConceptosPage.css';

export default function LsdLiquidacionPage() {
  const { empresa } = useEmpresa();
  const [periodo, setPeriodo] = useState(null);
  const [generando, setGenerando] = useState(false);
  const toast = useRef(null);

  async function handleGenerar() {
    setGenerando(true);
    try {
      const res = await fetch(api.getLiquidacionUrl(empresa.id, periodo));
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.mensaje || 'Error al generar el archivo');
      }
      const nombre = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'LSD_Liquidacion.txt';
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Archivo generado' });
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: err.message });
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="page-lsd-conceptos">
      <Toast ref={toast} />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-file-export" /> Libro de Sueldos Digital — Archivo de Liquidación</h2>
      </div>

      <div className="lsd-card">
        <p className="lsd-card-desc">
          Descarga el archivo .txt de ancho fijo ("Interfaz Usuario / Liquidación de SyJ - DJ F931")
          con los registros '01' (cabecera), '02' (referencial por trabajador) y '03' (detalle de
          conceptos liquidados) del período elegido. No incluye el registro '04' (bases imponibles
          para la DJ F931) — está pendiente.
        </p>

        <div className="form-field" style={{ maxWidth: 280, marginBottom: '1rem' }}>
          <label>Período</label>
          <PeriodoSelect value={periodo} onChange={e => setPeriodo(e.value)} empresa={empresa?.id} />
        </div>

        <Button
          label="Generar y descargar"
          icon="fa-solid fa-download"
          onClick={handleGenerar}
          loading={generando}
          disabled={!empresa || !periodo}
        />
      </div>
    </div>
  );
}
