import DisenoFormularioPage from './DisenoFormularioPage';
import { formulariosLibro } from '../../../api/informes';

export default function DisenoLibroSueldosPage() {
  return <DisenoFormularioPage api={formulariosLibro} titulo="Diseño de Libro de Sueldos" icono="fa-solid fa-pen-ruler" />;
}
