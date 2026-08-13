import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Home from './pages/Home';
import AyudaPage from './pages/ayuda/AyudaPage';
import EmpleadosPage from './pages/sueldos/EmpleadosPage';
import ConceptosPage from './pages/sueldos/conceptos/ConceptosPage';
import FormulasPage from './pages/sueldos/conceptos/FormulasPage';
import GruposDeConceptosPage from './pages/sueldos/conceptos/GruposDeConceptosPage';
import ConceptoGeneralPage from './pages/sueldos/conceptos/ConceptoGeneralPage';
import ClasesConceptoPage from './pages/sueldos/conceptos/ClasesConceptoPage';
import TablasPage from './pages/sueldos/conceptos/TablasPage';
import TiposTablaPage from './pages/sueldos/conceptos/TiposTablaPage';
import EmpresasPage from './pages/configuracion/EmpresasPage';
import ConveniosPage from './pages/configuracion/ConveniosPage';
import ObrasSocialesPage from './pages/configuracion/ObrasSocialesPage';
import SindicatosPage from './pages/configuracion/SindicatosPage';
import SituacionRevistaPage from './pages/configuracion/SituacionRevistaPage';
import CondicionLaboralPage from './pages/configuracion/CondicionLaboralPage';
import ActividadLaboralPage from './pages/configuracion/ActividadLaboralPage';
import ModalidadContratoPage from './pages/configuracion/ModalidadContratoPage';
import IncapacidadPage from './pages/configuracion/IncapacidadPage';
import CodigoZonaPage from './pages/configuracion/CodigoZonaPage';
import MonedaPage from './pages/configuracion/MonedaPage';
import LocalidadPage from './pages/configuracion/LocalidadPage';
import PaisPage from './pages/configuracion/PaisPage';
import ProyectoPage from './pages/configuracion/ProyectoPage';
import { EmpresaProvider } from './context/EmpresaContext';

export default function App() {
  return (
    <EmpresaProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          {/* sueldos */}
          <Route path="sueldos/empleados" element={<EmpleadosPage />} />
          <Route path="sueldos/empleados/:id" element={<div>Ficha de empleado</div>} />
          <Route path="sueldos/liquidaciones" element={<div>Liquidaciones</div>} />
          <Route path="sueldos/recibos" element={<div>Recibos</div>} />
          <Route path="sueldos/conceptos" element={<ConceptosPage />} />
          <Route path="sueldos/conceptos/formulas" element={<FormulasPage />} />
          <Route path="sueldos/conceptos/grupos" element={<GruposDeConceptosPage />} />
          <Route path="sueldos/conceptos/general" element={<ConceptoGeneralPage />} />
          <Route path="sueldos/conceptos/clases" element={<ClasesConceptoPage />} />
          <Route path="sueldos/conceptos/tablas" element={<TablasPage />} />
          <Route path="sueldos/conceptos/tipos-tabla" element={<TiposTablaPage />} />
          <Route path="sueldos/novedades" element={<div>Novedades</div>} />
          {/* ayuda */}
          <Route path="ayuda" element={<AyudaPage />} />
          {/* configuracion */}
          <Route path="configuracion/empresas" element={<EmpresasPage />} />
          <Route path="configuracion/convenios" element={<ConveniosPage />} />
          <Route path="configuracion/obras-sociales" element={<ObrasSocialesPage />} />
          <Route path="configuracion/sindicatos" element={<SindicatosPage />} />
          <Route path="configuracion/afip/situacion-revista" element={<SituacionRevistaPage />} />
          <Route path="configuracion/afip/condicion-laboral" element={<CondicionLaboralPage />} />
          <Route path="configuracion/afip/actividad-laboral" element={<ActividadLaboralPage />} />
          <Route path="configuracion/afip/modalidad-contrato" element={<ModalidadContratoPage />} />
          <Route path="configuracion/afip/incapacidad" element={<IncapacidadPage />} />
          <Route path="configuracion/afip/codigo-zona" element={<CodigoZonaPage />} />
          <Route path="configuracion/comunes/monedas" element={<MonedaPage />} />
          <Route path="configuracion/comunes/localidades" element={<LocalidadPage />} />
          <Route path="configuracion/comunes/paises" element={<PaisPage />} />
          <Route path="configuracion/comunes/proyectos" element={<ProyectoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </EmpresaProvider>
  );
}
