import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useEmpresa } from '../../../context/EmpresaContext';
import * as api from '../../../api/lsd';
import BotonVolver from '../../../components/BotonVolver';
import './LsdConceptosPage.css';

export default function LsdConceptosPage() {
  const { empresa } = useEmpresa();
  const [generando, setGenerando] = useState(false);
  const toast = useRef(null);

  async function handleGenerar() {
    setGenerando(true);
    try {
      const res = await fetch(api.getConceptosUrl(empresa.id));
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.mensaje || 'Error al generar el archivo');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'LSD_Conceptos.txt';
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
        <h2 className="page-title"><i className="fa-solid fa-file-export" /> Libro de Sueldos Digital — Archivo de Conceptos</h2>
      </div>

      <div className="lsd-card">
        <h3 className="lsd-card-title"><i className="fa-solid fa-download" /> Generar archivo de Conceptos</h3>
        <p className="lsd-card-desc">
          Descarga el archivo .txt de ancho fijo ("Interfase de Usuario / Relación conceptos de sueldo
          Empleador - ARCA") con la relación de conceptos de {empresa?.razon_social || 'la empresa'} y
          sus flags de aporte/contribución (SIPA, INSSJyP, Obra Social, FSR, RENATEA, AAFF, FNE, LRT,
          regímenes diferenciales/especiales), tal como se cargan en la solapa "LSD" de cada concepto.
        </p>
        <Button
          label="Generar y descargar"
          icon="fa-solid fa-download"
          onClick={handleGenerar}
          loading={generando}
          disabled={!empresa}
        />
      </div>
    </div>
  );
}
