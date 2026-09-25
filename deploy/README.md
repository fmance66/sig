# Instalación en otra PC (Docker)

La PC destino solo necesita **Docker Desktop**: no hace falta Node, Git ni el código.

## En esta PC: armar el paquete

```powershell
powershell -ExecutionPolicy Bypass -File deploy\empaquetar.ps1 -ConDatos
```

Deja en `deploy\paquete\` los archivos `sig-app.tar` (con las imágenes de la app y de postgres:16), `docker-compose.yml`, `instalar.ps1`, `INSTALAR.bat` y `sig.dump`. Sin `-ConDatos` no se incluye el dump, que es lo que se usa para actualizar.

El dump tiene datos reales (sueldos, contabilidad, IVA): pasarlo por USB o red local.

## En la PC destino

1. Instalar Docker Desktop y dejar activado *Start Docker Desktop when you sign in*.
2. Copiar la carpeta `paquete` y hacer doble clic en `INSTALAR.bat`.

Se instala en `C:\SIG` (compose + `.env` con `SESSION_SECRET`) y se crea el acceso directo `SIG` en el escritorio, que abre `http://localhost:3001`. Los contenedores tienen `restart: unless-stopped`, así que la app arranca sola con Docker Desktop.

## Actualizar

Generar el paquete sin `-ConDatos` y correr de nuevo `INSTALAR.bat`. Los datos quedan en el volumen `sig_datos` y no se tocan. El instalador aplica las migraciones pendientes (`db/migrate.js`).

Si se incluye un `sig.dump`, solo se restaura cuando la base está vacía. Para pisar los datos existentes: `instalar.ps1 -ForzarRestauracion`.

## Detalles

- La imagen no ejecuta `RUN`: la red dentro de `docker build` falla en Docker Desktop, así que `empaquetar.ps1` compila el frontend e instala las dependencias del backend en el host, y el Dockerfile solo copia.
- La imagen parte de `postgres:16-alpine` para tener `pg_dump`/`psql` 16, que usa el backup desde la UI (`PG_DIRECTO=1`).
- **No** setear `NODE_ENV=production`: activaría la cookie `Secure` y el login no funcionaría sobre http.
- Los nombres de instalación (imagen, contenedores, volumen, carpeta, acceso directo) son `sig`. La base y el usuario de Postgres siguen llamándose `sueldos`, igual que en desarrollo.
- Si el instalador encuentra una instalación anterior con el nombre "Sueldos" (volumen `sueldos_datos`), baja sus contenedores, copia los datos a `sig_datos` y borra `C:\Sueldos` y el acceso directo viejo. El volumen `sueldos_datos` queda como respaldo; cuando todo ande, se puede borrar con `docker volume rm sueldos_datos`. El aviso de compose *volume "sig_datos" already exists* que aparece esa vez es normal.
