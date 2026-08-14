import { useState, useRef } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import InformeFiltro, { FILTRO_VACIO } from './InformeFiltro';
import RecibosConceptosTable from './RecibosConceptosTable';
import * as api from '../../../api/informes';
import './informes.css';

export default function RecibosSueldoPage() {
  const [filtro, setFiltro] = useState(FILTRO_VACIO);
  const [recibos, setRecibos] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getRecibosSueldo(f);
      setRecibos(res.data.resultado.recibos);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los recibos' });
    } finally {
      setLoading(false);
    }
  }

  function limpiar() {
    setFiltro(FILTRO_VACIO);
    buscar(FILTRO_VACIO);
  }

  function descargarPdf() {
    if (!recibos.length) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Primero buscá los recibos a exportar' });
      return;
    }
    window.open(api.getReciboSueldoPdfUrl(filtro), '_blank');
  }

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <h2 className="page-title"><i className="fa-solid fa-file-invoice-dollar" /> Recibos de Sueldo</h2>

      <InformeFiltro filtro={filtro} onChange={setFiltro} onBuscar={() => buscar()} onLimpiar={limpiar} loading={loading}>
        <Button label="Descargar PDF" icon="fa-solid fa-file-pdf" size="small" className="p-button-outlined" onClick={descargarPdf} />
      </InformeFiltro>

      <RecibosConceptosTable recibos={recibos} />
    </div>
  );
}
