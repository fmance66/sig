import DisenoFormularioPage from './DisenoFormularioPage';
import { formulariosRecibo } from '../../../api/informes';

export default function DisenoRecibosSueldoPage() {
  return <DisenoFormularioPage api={formulariosRecibo} titulo="Diseño de Recibos de Sueldo" icono="fa-solid fa-pen-ruler" />;
}
