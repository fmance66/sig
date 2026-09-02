import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';

// Se oculta si esta pantalla es la primera del historial de esta pestaña
// (llegada directa, ej. F5 o URL pegada): "idx" es el campo que la librería
// history (usada por react-router) guarda en window.history.state, 0 en la
// primera entrada y creciente con cada navegación in-app.
export default function BotonVolver({ to }) {
  const navigate = useNavigate();
  const hayHistorial = (window.history.state?.idx ?? 0) > 0;
  if (!hayHistorial) return null;

  return (
    <Button
      label="Volver"
      icon="fa-solid fa-arrow-left"
      className="p-button-text p-button-sm boton-volver"
      onClick={() => (to ? navigate(to) : navigate(-1))}
    />
  );
}
