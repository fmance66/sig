import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Home from './pages/Home';
import AyudaPage from './pages/ayuda/AyudaPage';
import EmpleadosPage from './pages/sueldos/EmpleadosPage';
import EmpresasPage from './pages/configuracion/EmpresasPage';
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
          <Route path="sueldos/convenios" element={<div>Listado de convenios</div>} />
          <Route path="sueldos/obras-sociales" element={<div>Listado de obras sociales</div>} />
          <Route path="sueldos/sindicatos" element={<div>Listado de sindicatos</div>} />
          <Route path="sueldos/liquidaciones" element={<div>Liquidaciones</div>} />
          <Route path="sueldos/recibos" element={<div>Recibos</div>} />
          <Route path="sueldos/conceptos" element={<div>Conceptos</div>} />
          <Route path="sueldos/novedades" element={<div>Novedades</div>} />
          {/* ayuda */}
          <Route path="ayuda" element={<AyudaPage />} />
          {/* configuracion */}
          <Route path="configuracion/empresas" element={<EmpresasPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </EmpresaProvider>
  );
}
