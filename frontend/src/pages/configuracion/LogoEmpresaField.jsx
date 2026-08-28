import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import * as api from '../../api/empresas';

export default function LogoEmpresaField({ empresaId, toast }) {
  const [version, setVersion] = useState(0);
  const [hasLogo, setHasLogo] = useState(true); // se corrige a false si el GET falla (no hay logo)
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!empresaId) {
    return (
      <div className="logo-field logo-field--disabled">
        <div className="logo-field-preview">
          <i className="fa-solid fa-building" />
        </div>
        <p className="logo-field-hint">Guardá la empresa primero para poder subir el logo.</p>
      </div>
    );
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast?.current?.show({ severity: 'warn', summary: 'Atención', detail: 'La imagen debe ser PNG o JPEG' });
      return;
    }
    setUploading(true);
    try {
      await api.uploadLogo(empresaId, file);
      setHasLogo(true);
      setVersion(v => v + 1);
      toast?.current?.show({ severity: 'success', summary: 'OK', detail: 'Logo actualizado' });
    } catch {
      toast?.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo subir el logo' });
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setUploading(true);
    try {
      await api.deleteLogo(empresaId);
      setHasLogo(false);
      toast?.current?.show({ severity: 'success', summary: 'OK', detail: 'Logo eliminado' });
    } catch {
      toast?.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el logo' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="logo-field">
      <div className="logo-field-preview">
        {hasLogo ? (
          <img src={api.getLogoUrl(empresaId, version)} alt="Logo" onError={() => setHasLogo(false)} />
        ) : (
          <i className="fa-solid fa-building" />
        )}
      </div>
      <div className="logo-field-actions">
        <Button
          label={hasLogo ? 'Cambiar logo' : 'Subir logo'}
          icon="fa-solid fa-upload"
          className="p-button-sm p-button-outlined"
          onClick={() => fileInputRef.current?.click()}
          loading={uploading}
        />
        {hasLogo && (
          <Button
            label="Quitar"
            icon="fa-solid fa-trash"
            className="p-button-sm p-button-text p-button-danger"
            onClick={handleRemove}
            disabled={uploading}
          />
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
