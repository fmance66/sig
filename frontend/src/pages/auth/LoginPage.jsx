import { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useAuth } from '../../context/AuthContext';
import mainItLogo from '../../assets/mainit-logo.svg';
import './LoginPage.css';

export default function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(usuario, password);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo iniciar sesión';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <Toast ref={toast} />
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={mainItLogo} alt="MAIN IT" className="login-logo" />
        <h1 className="login-title">Sistema Integrado de Gestión</h1>
        <p className="login-subtitle">Ingresá tus credenciales para continuar</p>

        <div className="login-field">
          <label htmlFor="usuario">Usuario</label>
          <InputText id="usuario" value={usuario} onChange={e => setUsuario(e.target.value)} autoFocus required />
        </div>
        <div className="login-field">
          <label htmlFor="password">Contraseña</label>
          <Password
            id="password" value={password} onChange={e => setPassword(e.target.value)}
            feedback={false} toggleMask required inputClassName="login-password-input"
          />
        </div>

        <Button type="submit" label="Ingresar" icon="fa-solid fa-right-to-bracket" loading={loading} className="login-submit" />
      </form>
    </div>
  );
}
