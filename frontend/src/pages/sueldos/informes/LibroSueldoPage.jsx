import { useState, useRef } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import InformeFiltro, { FILTRO_VACIO } from './InformeFiltro';
import RecibosConceptosTable from './RecibosConceptosTable';
import { useEmpresa } from '../../../context/EmpresaContext';
import * as api from '../../../api/informes';
import './informes.css';

export default function LibroSueldoPage() {
  const { empresa } = useEmpresa();
  const [filtro, setFiltro] = useState(FILTRO_VACIO);
  const [recibos, setRecibos] = useState([]);
  const [seleccion, setSeleccion] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getRecibosSueldo({ ...f, empresa: empresa?.id });
      const data = res.data.resultado.recibos;
      setRecibos(data);
      setSeleccion(data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los recibos' });
    } finally {
      setLoading(false);
    }
  }

  function limpiar() {
    setFiltro(FILTRO_VACIO);
    setRecibos([]);
    setSeleccion([]);
  }

  function descargarPdf() {
    if (!recibos.length) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Primero buscá los recibos a exportar' });
      return;
    }
    window.open(api.getLibroSueldoPdfUrl({ ...filtro, empresa: empresa?.id }, seleccion), '_blank');
  }

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <h2 className="page-title"><i className="fa-solid fa-book" /> Libro de Sueldos</h2>

      <InformeFiltro
        filtro={filtro} onChange={setFiltro} onBuscar={() => buscar()} onLimpiar={limpiar} loading={loading}
        actions={(
          <Button
            label={seleccion.length ? `Descargar PDF (${seleccion.length})` : 'Descargar PDF'}
            icon="fa-solid fa-file-pdf" size="small" className="p-button-outlined" onClick={descargarPdf}
          />
        )}
      />

      <RecibosConceptosTable recibos={recibos} selection={seleccion} onSelectionChange={e => setSeleccion(e.value)} mostrarTotal />
    </div>
  );
}
