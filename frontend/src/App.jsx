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
import NovedadesPage from './pages/sueldos/novedades/NovedadesPage';
import NovedadesPorTablaPage from './pages/sueldos/novedades/NovedadesPorTablaPage';
import NovedadesSecuencialesPage from './pages/sueldos/novedades/NovedadesSecuencialesPage';
import NovedadesAutomaticasPage from './pages/sueldos/novedades/NovedadesAutomaticasPage';
import TipoNovedadPage from './pages/sueldos/novedades/TipoNovedadPage';
import EliminarNovedadesPage from './pages/sueldos/novedades/EliminarNovedadesPage';
import HistorialesPage from './pages/sueldos/historial/HistorialesPage';
import HistorialesEmpleadoPage from './pages/sueldos/historial/HistorialesEmpleadoPage';
import HistorialesAutomaticosPage from './pages/sueldos/historial/HistorialesAutomaticosPage';
import CampoHistorialPage from './pages/sueldos/historial/CampoHistorialPage';
import EliminarHistorialesPage from './pages/sueldos/historial/EliminarHistorialesPage';
import EliminarHistorialesEmpleadoPage from './pages/sueldos/historial/EliminarHistorialesEmpleadoPage';
import MotivoAusentismoPage from './pages/sueldos/asistencia/MotivoAusentismoPage';
import AusentismoPage from './pages/sueldos/asistencia/AusentismoPage';
import PresentismoPage from './pages/sueldos/asistencia/PresentismoPage';
import JornadaLaboralPage from './pages/sueldos/asistencia/JornadaLaboralPage';
import FeriadosPage from './pages/sueldos/asistencia/FeriadosPage';
import LiquidacionesPage from './pages/sueldos/liquidaciones/LiquidacionesPage';
import RecibosPage from './pages/sueldos/liquidaciones/RecibosPage';
import ReciboEmpleadoPage from './pages/sueldos/liquidaciones/ReciboEmpleadoPage';
import RecibosAutomaticosPage from './pages/sueldos/liquidaciones/RecibosAutomaticosPage';
import RecibosRecalculadosPage from './pages/sueldos/liquidaciones/RecibosRecalculadosPage';
import ContribucionesPage from './pages/sueldos/liquidaciones/ContribucionesPage';
import EliminacionMasivaPage from './pages/sueldos/liquidaciones/EliminacionMasivaPage';
import ConceptosPorGrupoPage from './pages/sueldos/informes/ConceptosPorGrupoPage';
import ConceptosAcumuladosPage from './pages/sueldos/informes/ConceptosAcumuladosPage';
import ConceptosPorEmpleadoPage from './pages/sueldos/informes/ConceptosPorEmpleadoPage';
import ConceptosPorReciboPage from './pages/sueldos/informes/ConceptosPorReciboPage';
import RemuneracionPorConceptosPage from './pages/sueldos/informes/RemuneracionPorConceptosPage';
import RemuneracionPorEmpleadosPage from './pages/sueldos/informes/RemuneracionPorEmpleadosPage';
import RemuneracionPorGruposPage from './pages/sueldos/informes/RemuneracionPorGruposPage';
import RecibosAgrupadosPeriodoPage from './pages/sueldos/informes/RecibosAgrupadosPeriodoPage';
import RecibosAgrupadosEmpleadoPage from './pages/sueldos/informes/RecibosAgrupadosEmpleadoPage';
import RecibosSueldoPage from './pages/sueldos/informes/RecibosSueldoPage';
import LibroSueldoPage from './pages/sueldos/informes/LibroSueldoPage';
import DisenoRecibosSueldoPage from './pages/sueldos/informes/DisenoRecibosSueldoPage';
import DisenoLibroSueldosPage from './pages/sueldos/informes/DisenoLibroSueldosPage';
import InformesPersonalizadosPage from './pages/sueldos/informes/InformesPersonalizadosPage';
import DisenoInformesPersonalizadosPage from './pages/sueldos/informes/DisenoInformesPersonalizadosPage';
import LsdConceptosPage from './pages/sueldos/exportacion/LsdConceptosPage';
import LsdLiquidacionPage from './pages/sueldos/exportacion/LsdLiquidacionPage';
import LsdTopesPage from './pages/sueldos/exportacion/LsdTopesPage';
import PlanDeCuentasPage from './pages/contabilidad/PlanDeCuentasPage';
import ListadoCuentasPage from './pages/contabilidad/ListadoCuentasPage';
import CentrosDeCostoPage from './pages/contabilidad/CentrosDeCostoPage';
import LeyendasPage from './pages/contabilidad/LeyendasPage';
import EjerciciosPage from './pages/contabilidad/EjerciciosPage';
import AsientoAperturaPage from './pages/contabilidad/AsientoAperturaPage';
import AsientoCierrePage from './pages/contabilidad/AsientoCierrePage';
import CoeficientesPage from './pages/contabilidad/CoeficientesPage';
import AjusteInflacionPage from './pages/contabilidad/AjusteInflacionPage';
import ListadoAsientosPage from './pages/contabilidad/ListadoAsientosPage';
import UnionAsientosPage from './pages/contabilidad/UnionAsientosPage';
import RenumeracionAsientosPage from './pages/contabilidad/RenumeracionAsientosPage';
import ListadoAsientosModeloPage from './pages/contabilidad/ListadoAsientosModeloPage';
import AsientosDesbalanceadosPage from './pages/contabilidad/AsientosDesbalanceadosPage';
import InformeMayorCuentasPage from './pages/contabilidad/InformeMayorCuentasPage';
import InformeBalanceGeneralPage from './pages/contabilidad/InformeBalanceGeneralPage';
import InformeBalanceSumasSaldosPage from './pages/contabilidad/InformeBalanceSumasSaldosPage';
import InformeLibroDiarioAcumuladoPage from './pages/contabilidad/InformeLibroDiarioAcumuladoPage';
import InformeLibroCentrosCostoPage from './pages/contabilidad/InformeLibroCentrosCostoPage';
import InformeBalanceCentrosCostoPage from './pages/contabilidad/InformeBalanceCentrosCostoPage';
import ImpuestosPage from './pages/iva/ImpuestosPage';
import CondicionVentaPage from './pages/iva/CondicionVentaPage';
import ModalidadesPage from './pages/iva/ModalidadesPage';
import PuntosVentaPage from './pages/iva/PuntosVentaPage';
import TipoComprobantePage from './pages/iva/TipoComprobantePage';
import ModeloComprobantePage from './pages/iva/ModeloComprobantePage';
import ListadoPersonasPage from './pages/iva/ListadoPersonasPage';
import ListadoItemsPage from './pages/iva/ListadoItemsPage';
import PeriodosPage from './pages/iva/PeriodosPage';
import ListadoComprobantesIvaPage from './pages/iva/ListadoComprobantesIvaPage';
import InformeLibroIvaPage from './pages/iva/InformeLibroIvaPage';
import InformeResumenIvaPage from './pages/iva/InformeResumenIvaPage';
import InformeDeclaracionJuradaIvaPage from './pages/iva/InformeDeclaracionJuradaIvaPage';
import InformeComprobantesIvaPage from './pages/iva/InformeComprobantesIvaPage';
import InformeRubrosIvaPage from './pages/iva/InformeRubrosIvaPage';
import InformeProvinciasIvaPage from './pages/iva/InformeProvinciasIvaPage';
import InformeItemsIvaPage from './pages/iva/InformeItemsIvaPage';
import InformeItemsPorComprobantePage from './pages/iva/InformeItemsPorComprobantePage';
import ListadoFormulasAsientoPage from './pages/iva/ListadoFormulasAsientoPage';
import EmpresasPage from './pages/configuracion/EmpresasPage';
import CopiarConfiguracionPage from './pages/configuracion/CopiarConfiguracionPage';
import CopiaSeguridadPage from './pages/configuracion/CopiaSeguridadPage';
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
import UsuariosPage from './pages/configuracion/UsuariosPage';
import GruposPage from './pages/configuracion/GruposPage';
import PermisosPage from './pages/configuracion/PermisosPage';
import SesionesPage from './pages/configuracion/SesionesPage';
import LoginPage from './pages/auth/LoginPage';
import RequireAuth from './routes/RequireAuth';
import { EmpresaProvider } from './context/EmpresaContext';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
    <EmpresaProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          {/* sueldos */}
          <Route path="sueldos/empleados" element={<EmpleadosPage />} />
          <Route path="sueldos/empleados/:id" element={<div>Ficha de empleado</div>} />
          <Route path="sueldos/liquidaciones" element={<LiquidacionesPage />} />
          <Route path="sueldos/liquidaciones/recibos" element={<RecibosPage />} />
          <Route path="sueldos/liquidaciones/recibo" element={<ReciboEmpleadoPage />} />
          <Route path="sueldos/liquidaciones/recibo/:periodo/:empleado/:numero" element={<ReciboEmpleadoPage />} />
          <Route path="sueldos/liquidaciones/recibos-automaticos" element={<RecibosAutomaticosPage />} />
          <Route path="sueldos/liquidaciones/recibos-recalculados" element={<RecibosRecalculadosPage />} />
          <Route path="sueldos/liquidaciones/contribuciones" element={<ContribucionesPage columna="CONTRIBUCION" />} />
          <Route path="sueldos/liquidaciones/auxiliares" element={<ContribucionesPage columna="AUXILIAR" />} />
          <Route path="sueldos/liquidaciones/eliminacion-masiva" element={<EliminacionMasivaPage />} />
          <Route path="sueldos/conceptos" element={<ConceptosPage />} />
          <Route path="sueldos/conceptos/formulas" element={<FormulasPage />} />
          <Route path="sueldos/conceptos/grupos" element={<GruposDeConceptosPage />} />
          <Route path="sueldos/conceptos/general" element={<ConceptoGeneralPage />} />
          <Route path="sueldos/conceptos/clases" element={<ClasesConceptoPage />} />
          <Route path="sueldos/conceptos/tablas" element={<TablasPage />} />
          <Route path="sueldos/conceptos/tipos-tabla" element={<TiposTablaPage />} />
          <Route path="sueldos/novedades" element={<NovedadesPage />} />
          <Route path="sueldos/novedades/por-tabla" element={<NovedadesPorTablaPage />} />
          <Route path="sueldos/novedades/secuenciales" element={<NovedadesSecuencialesPage />} />
          <Route path="sueldos/novedades/automaticas" element={<NovedadesAutomaticasPage />} />
          <Route path="sueldos/novedades/tipos" element={<TipoNovedadPage />} />
          <Route path="sueldos/novedades/eliminar" element={<EliminarNovedadesPage />} />
          <Route path="sueldos/historial" element={<HistorialesPage />} />
          <Route path="sueldos/historial/empleado" element={<HistorialesEmpleadoPage />} />
          <Route path="sueldos/historial/automaticos" element={<HistorialesAutomaticosPage />} />
          <Route path="sueldos/historial/campos" element={<CampoHistorialPage />} />
          <Route path="sueldos/historial/eliminar" element={<EliminarHistorialesPage />} />
          <Route path="sueldos/historial/empleado/eliminar" element={<EliminarHistorialesEmpleadoPage />} />
          <Route path="sueldos/asistencia/motivos-ausentismo" element={<MotivoAusentismoPage />} />
          <Route path="sueldos/asistencia/ausentismo" element={<AusentismoPage />} />
          <Route path="sueldos/asistencia/presentismo" element={<PresentismoPage />} />
          <Route path="sueldos/asistencia/jornada-laboral" element={<JornadaLaboralPage />} />
          <Route path="sueldos/asistencia/feriados" element={<FeriadosPage />} />
          {/* informes */}
          <Route path="sueldos/informes/conceptos-por-grupo" element={<ConceptosPorGrupoPage />} />
          <Route path="sueldos/informes/conceptos-acumulados" element={<ConceptosAcumuladosPage />} />
          <Route path="sueldos/informes/conceptos-por-empleado" element={<ConceptosPorEmpleadoPage />} />
          <Route path="sueldos/informes/conceptos-por-recibo" element={<ConceptosPorReciboPage />} />
          <Route path="sueldos/informes/remuneracion-por-conceptos" element={<RemuneracionPorConceptosPage />} />
          <Route path="sueldos/informes/remuneracion-por-empleados" element={<RemuneracionPorEmpleadosPage />} />
          <Route path="sueldos/informes/remuneracion-por-grupos" element={<RemuneracionPorGruposPage />} />
          <Route path="sueldos/informes/recibos-agrupados-periodo" element={<RecibosAgrupadosPeriodoPage />} />
          <Route path="sueldos/informes/recibos-agrupados-empleado" element={<RecibosAgrupadosEmpleadoPage />} />
          <Route path="sueldos/informes/recibos-sueldo" element={<RecibosSueldoPage />} />
          <Route path="sueldos/informes/libro-sueldos" element={<LibroSueldoPage />} />
          <Route path="sueldos/informes/diseno-recibos-sueldo" element={<DisenoRecibosSueldoPage />} />
          <Route path="sueldos/informes/diseno-libro-sueldos" element={<DisenoLibroSueldosPage />} />
          <Route path="sueldos/informes/personalizados" element={<InformesPersonalizadosPage />} />
          <Route path="sueldos/informes/diseno-personalizados" element={<DisenoInformesPersonalizadosPage />} />

          {/* exportación */}
          <Route path="sueldos/exportacion/lsd-conceptos" element={<LsdConceptosPage />} />
          <Route path="sueldos/exportacion/lsd-liquidacion" element={<LsdLiquidacionPage />} />
          <Route path="sueldos/exportacion/lsd-topes" element={<LsdTopesPage />} />
          {/* contabilidad */}
          <Route path="contabilidad/plan-cuentas" element={<PlanDeCuentasPage />} />
          <Route path="contabilidad/cuentas" element={<ListadoCuentasPage />} />
          <Route path="contabilidad/centros-costo" element={<CentrosDeCostoPage />} />
          <Route path="contabilidad/leyendas" element={<LeyendasPage />} />
          <Route path="contabilidad/ejercicios" element={<EjerciciosPage />} />
          <Route path="contabilidad/ejercicios/asiento-apertura" element={<AsientoAperturaPage />} />
          <Route path="contabilidad/ejercicios/asiento-cierre" element={<AsientoCierrePage />} />
          <Route path="contabilidad/ejercicios/coeficientes" element={<CoeficientesPage />} />
          <Route path="contabilidad/ejercicios/ajuste-inflacion" element={<AjusteInflacionPage />} />
          <Route path="contabilidad/asientos" element={<ListadoAsientosPage />} />
          <Route path="contabilidad/union-asientos" element={<UnionAsientosPage />} />
          <Route path="contabilidad/asientos-renumeracion" element={<RenumeracionAsientosPage />} />
          <Route path="contabilidad/asientos-modelo" element={<ListadoAsientosModeloPage />} />
          <Route path="contabilidad/asientos-desbalanceados" element={<AsientosDesbalanceadosPage />} />
          <Route path="contabilidad/informes/mayor-cuentas" element={<InformeMayorCuentasPage />} />
          <Route path="contabilidad/informes/balance-general" element={<InformeBalanceGeneralPage />} />
          <Route path="contabilidad/informes/balance-sumas-saldos" element={<InformeBalanceSumasSaldosPage />} />
          <Route path="contabilidad/informes/libro-diario-acumulado" element={<InformeLibroDiarioAcumuladoPage />} />
          <Route path="contabilidad/informes/libro-centros-costo" element={<InformeLibroCentrosCostoPage />} />
          <Route path="contabilidad/informes/balance-centros-costo" element={<InformeBalanceCentrosCostoPage />} />
          {/* iva */}
          <Route path="iva/compras/comprobantes" element={<ListadoComprobantesIvaPage modulo="COMPRA" />} />
          <Route path="iva/compras/proveedores" element={<ListadoPersonasPage modulo="COMPRA" />} />
          <Route path="iva/compras/items" element={<ListadoItemsPage modulo="COMPRA" />} />
          <Route path="iva/ventas/comprobantes" element={<ListadoComprobantesIvaPage modulo="VENTA" />} />
          <Route path="iva/ventas/clientes" element={<ListadoPersonasPage modulo="VENTA" />} />
          <Route path="iva/ventas/items" element={<ListadoItemsPage modulo="VENTA" />} />
          <Route path="iva/periodos" element={<PeriodosPage />} />
          <Route path="iva/informes/libro" element={<InformeLibroIvaPage />} />
          <Route path="iva/informes/resumen" element={<InformeResumenIvaPage />} />
          <Route path="iva/informes/ddjj" element={<InformeDeclaracionJuradaIvaPage />} />
          <Route path="iva/informes/comprobantes" element={<InformeComprobantesIvaPage />} />
          <Route path="iva/informes/rubros" element={<InformeRubrosIvaPage />} />
          <Route path="iva/informes/provincias" element={<InformeProvinciasIvaPage />} />
          <Route path="iva/informes/items" element={<InformeItemsIvaPage />} />
          <Route path="iva/informes/items-por-comprobante" element={<InformeItemsPorComprobantePage />} />
          <Route path="iva/formulas-asiento" element={<ListadoFormulasAsientoPage />} />
          <Route path="iva/tablas/impuestos" element={<ImpuestosPage />} />
          <Route path="iva/tablas/condicion-venta" element={<CondicionVentaPage />} />
          <Route path="iva/tablas/modalidades" element={<ModalidadesPage />} />
          <Route path="iva/tablas/tipo-comprobante" element={<TipoComprobantePage />} />
          <Route path="iva/tablas/modelo-comprobante" element={<ModeloComprobantePage />} />
          <Route path="iva/tablas/punto-venta" element={<PuntosVentaPage />} />
          {/* ayuda */}
          <Route path="ayuda" element={<AyudaPage />} />
          {/* configuracion */}
          <Route path="configuracion/empresas" element={<EmpresasPage />} />
          <Route path="configuracion/empresas/copiar-configuracion" element={<CopiarConfiguracionPage />} />
          <Route path="configuracion/empresas/backup" element={<CopiaSeguridadPage />} />
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
          {/* seguridad */}
          <Route path="configuracion/seguridad/usuarios" element={<UsuariosPage />} />
          <Route path="configuracion/seguridad/grupos" element={<GruposPage />} />
          <Route path="configuracion/seguridad/permisos" element={<PermisosPage />} />
          <Route path="configuracion/seguridad/sesiones" element={<SesionesPage />} />
        </Route>
        </Route>
      </Routes>
    </BrowserRouter>
    </EmpresaProvider>
    </AuthProvider>
  );
}
