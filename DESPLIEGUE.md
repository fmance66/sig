# Despliegue en otra PC (Docker)

La app se instala en otra PC como imágenes Docker. En la PC destino solo hace falta **Docker Desktop**: no se necesita Node, Git ni el código fuente. El detalle técnico está en [deploy/README.md](deploy/README.md).

## Cómo se usa

1. **En esta PC**, armar el paquete:
   ```powershell
   powershell -ExecutionPolicy Bypass -File deploy\empaquetar.ps1 -ConDatos
   ```
   Genera la carpeta `deploy\paquete\`, de unos 322 MB más el dump de la base.
2. **En la PC destino**: instalar Docker Desktop, copiar esa carpeta y hacer doble clic en `INSTALAR.bat`. Queda un acceso directo "SIG" en el escritorio, y la app arranca sola cada vez que se prende Docker Desktop.
3. **Para actualizar**: empaquetar sin `-ConDatos` y volver a correr `INSTALAR.bat`. Los datos no se tocan y las migraciones pendientes se aplican solas.

El paquete con `-ConDatos` tiene datos reales (sueldos, contabilidad, IVA): pasarlo por USB o red local, nunca por canales públicos.

## Nombres

Todo lo que se ve en la instalación se llama `sig` (Sistema Integrado de Gestión): la imagen `sig-app`, los contenedores `sig_app` y `sig_db`, el volumen `sig_datos`, la carpeta `C:\SIG` y el acceso directo "SIG". La base y el usuario de Postgres siguen llamándose `sueldos`, igual que en desarrollo.

Si la PC destino ya tenía la instalación vieja "Sueldos", `INSTALAR.bat` la migra sola: baja los contenedores viejos, copia los datos al volumen nuevo y borra `C:\Sueldos` y el acceso directo viejo. El volumen `sueldos_datos` queda como respaldo. Cuando todo ande, se borra con `docker volume rm sueldos_datos`.

## Por qué el build no usa internet

Dentro de `docker build`, Docker Desktop no tiene red en esta máquina (falla el DNS de BuildKit). Por eso `empaquetar.ps1` compila el frontend e instala las dependencias del backend en Windows, y el `Dockerfile` solo copia esos archivos. Funciona porque las dependencias del backend son JavaScript puro.

## Qué se verificó

Se armó el paquete y se instaló en una carpeta temporal con los datos reales. Resultados:

- Se restauraron las 103 tablas.
- La app carga, incluidas las rutas de React.
- `pg_dump` funciona dentro del contenedor.
- El backup desde la UI genera y restaura bien.

Falta probar el login con usuario y contraseña: solo se verificó que la API responde 401 sin sesión.

## Cambios en el código

- Se borraron `scripts/instalar.ps1` y `scripts/exportar-base.ps1`, que ya no sirven.
- Archivos nuevos: `Dockerfile`, `.dockerignore` y `deploy/`, que contiene `empaquetar.ps1`, `instalar.ps1`, `INSTALAR.bat`, `docker-compose.yml` y `README.md`.
- [backup.js](backend/src/controllers/backup.js): con `PG_DIRECTO=1`, el backup desde la UI corre `pg_dump`/`psql` dentro del contenedor. En desarrollo sigue usando `docker exec` como antes.
- [server.js](backend/src/server.js) acepta la variable `HOST`, porque el contenedor tiene que escuchar en `0.0.0.0`.
- [migrate.js](db/migrate.js) toma la conexión de las variables `DB_*`, igual que `backend/src/config/db.js`.
- `.gitignore`: se agregaron `deploy/paquete/` y `deploy/.build/`.

## Cuidados

- **No** setear `NODE_ENV=production`: activaría la cookie `Secure` y el login no funcionaría sobre http.
- No dejar dumps (`*.dump`) sueltos en la raíz del repo, porque no están en el `.gitignore`.
