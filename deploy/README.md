# Instalación en otra PC (Docker)

La PC destino solo necesita **Docker Desktop**: no hace falta Node, Git ni el código.

## En esta PC: armar el paquete

```powershell
powershell -ExecutionPolicy Bypass -File deploy\empaquetar.ps1 -ConDatos
```

Deja en `deploy\paquete\` los archivos `sueldos-app.tar` (con las imágenes de la app y de postgres:16), `docker-compose.yml`, `instalar.ps1`, `INSTALAR.bat` y `sueldos.dump`. Sin `-ConDatos` no se incluye el dump, que es lo que se usa para actualizar.

El dump tiene datos reales de sueldos: pasarlo por USB o red local.

## En la PC destino

1. Instalar Docker Desktop y dejar activado *Start Docker Desktop when you sign in*.
2. Copiar la carpeta `paquete` y hacer doble clic en `INSTALAR.bat`.

Se instala en `C:\Sueldos` (compose + `.env` con `SESSION_SECRET`) y se crea el acceso directo `Sueldos` en el escritorio, que abre `http://localhost:3001`. Los contenedores tienen `restart: unless-stopped`, así que la app arranca sola con Docker Desktop.

## Actualizar

Generar el paquete sin `-ConDatos` y correr de nuevo `INSTALAR.bat`. Los datos quedan en el volumen `sueldos_datos` y no se tocan. El instalador aplica las migraciones pendientes (`db/migrate.js`).

Si se incluye un `sueldos.dump`, solo se restaura cuando la base está vacía. Para pisar los datos existentes: `instalar.ps1 -ForzarRestauracion`.

## Detalles

- La imagen no ejecuta `RUN`: la red dentro de `docker build` falla en Docker Desktop, así que `empaquetar.ps1` compila el frontend e instala las dependencias del backend en el host, y el Dockerfile solo copia.
- La imagen parte de `postgres:16-alpine` para tener `pg_dump`/`psql` 16, que usa el backup desde la UI (`PG_DIRECTO=1`).
- **No** setear `NODE_ENV=production`: activaría la cookie `Secure` y el login no funcionaría sobre http.
