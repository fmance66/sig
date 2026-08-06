import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';

export default function MailTab({ form, onChange }) {
  return (
    <div className="form-grid">
      <div className="form-field form-field--full">
        <label>Dirección de Email</label>
        <InputText name="mail_address" value={form.mail_address ?? ''} onChange={onChange} placeholder="info@empresa.com" />
      </div>
      <div className="form-field">
        <label>Nombre de Cuenta</label>
        <InputText name="mail_account" value={form.mail_account ?? ''} onChange={onChange} />
      </div>
      <div className="form-field">
        <label>Usuario</label>
        <InputText name="mail_username" value={form.mail_username ?? ''} onChange={onChange} />
      </div>
      <div className="form-field form-field--full">
        <label>Contraseña</label>
        <Password
          name="mail_password"
          value={form.mail_password ?? ''}
          onChange={onChange}
          feedback={false}
          toggleMask
          inputStyle={{ width: '100%' }}
          style={{ width: '100%' }}
        />
      </div>
      <div className="form-field">
        <label>Servidor SMTP</label>
        <InputText name="smtp_host" value={form.smtp_host ?? ''} onChange={onChange} placeholder="smtp.empresa.com" />
      </div>
      <div className="form-field">
        <label>Puerto</label>
        <InputText name="smtp_port" value={form.smtp_port ?? ''} onChange={onChange} type="number" placeholder="587" />
      </div>
    </div>
  );
}
