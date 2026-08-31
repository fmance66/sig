import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Toast } from 'primereact/toast';
import * as api from '../api/auth';
import { setAuthHandlers } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [permisos, setPermisos] = useState({});
  const [loading, setLoading] = useState(true);
  const toast = useRef(null);

  const aplicarSesion = useCallback((resultado) => {
    setUsuario(resultado.usuario);
    setPermisos(resultado.permisos);
  }, []);

  const limpiarSesion = useCallback(() => {
    setUsuario(null);
    setPermisos({});
  }, []);

  useEffect(() => {
    api.getMe()
      .then(res => aplicarSesion(res.data.resultado))
      .catch(() => limpiarSesion())
      .finally(() => setLoading(false));
  }, [aplicarSesion, limpiarSesion]);

  // La sesión es por cookie (no token en localStorage) — si el backend
  // devuelve 401 en cualquier request, significa que ya no hay sesión activa.
  useEffect(() => {
    setAuthHandlers({
      onUnauthorized: limpiarSesion,
      onForbidden: (mensaje) => toast.current?.show({
        severity: 'warn', summary: 'Sin permiso',
        detail: mensaje || 'No tiene permiso para realizar esta acción',
      }),
    });
    return () => setAuthHandlers({});
  }, [limpiarSesion]);

  async function login(usuarioInput, password) {
    const res = await api.login(usuarioInput, password);
    aplicarSesion(res.data.resultado);
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      limpiarSesion();
    }
  }

  function hasPermiso(modulo, accion = 'ver') {
    return !!permisos[modulo]?.[accion];
  }

  return (
    <AuthContext.Provider value={{ usuario, permisos, loading, login, logout, hasPermiso }}>
      <Toast ref={toast} />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
