# Despliegue en otra PC (ej. PC de tu mujer)

Plan para instalar el sistema completo en una PC nueva, sin nada preinstalado, llevando los datos reales de la base y dejando el frontend en modo "producción" local (build servido por el backend, un solo proceso).

## 0. Qué se lleva

El repo es único en GitHub (`fmance66/sig`) con `backend/` y `frontend/` como subcarpetas. En la PC destino alcanza con clonar ese repo — no hace falta copiar carpetas a mano, salvo el dump de datos de la base.

## 1. Instalar prerequisitos en la PC destino

- **Docker Desktop** (activar WSL2 si Windows lo pide) → para Postgres 16.
- **Node.js LTS** (v20 o v22) → para backend y build del frontend.
- **Git** → para clonar el repo.
- Reiniciar y confirmar que Docker Desktop quede corriendo como servicio.

## 2. Clonar el repo

```powershell
git clone https://github.com/fmance66/sig.git C:\sig
```

Si el repo es privado, hace falta loguear GitHub en esa PC (o usar un PAT).

## 3. Levantar Postgres vacío

```powershell
cd C:\sig\db
docker compose up -d
```

Esto crea el contenedor y corre `01_schema.sql` / `02_migrate_data.sql` de `db/postgresql/` sobre una base vacía.

## 4. Migrar los datos reales

**En la PC de origen** (esta PC):

```bash
docker exec sueldos_db pg_dump -U sueldos -d sueldos -F c -f /tmp/sueldos.dump
docker cp sueldos_db:/tmp/sueldos.dump ./sueldos.dump
```

Copiar `sueldos.dump` a la PC destino (USB, red, o un storage temporal — **no** por un canal público, contiene datos de sueldos).

**En la PC destino**, con el contenedor ya arriba y el schema aplicado:

```powershell
docker cp .\sueldos.dump sueldos_db:/tmp/sueldos.dump
docker exec sueldos_db pg_restore -U sueldos -d sueldos --clean --if-exists /tmp/sueldos.dump
```

## 5. Configurar backend

Crear `backend/.env` (no está en git), igual al de origen ajustando lo necesario:

```
PORT=3001
FRONTEND_URL=http://localhost:3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sueldos
DB_USER=sueldos
DB_PASSWORD=sueldos123
SESSION_SECRET=<generar uno nuevo, no reusar el de origen>
```

```powershell
cd C:\sig\backend
npm install
```

## 6. Frontend en modo producción

Hoy el frontend corre con Vite dev server (`npm run dev`) y el backend no sirve estáticos. Para modo producción simple, sin instalar nginx, la opción más liviana es que **Express sirva el build de Vite**:

- `backend/src/app.js` ya sirve el build con `express.static` sobre `frontend/dist` + fallback a `index.html` para las rutas de React Router (rutas `/api/*` quedan excluidas del fallback).
- Build: `cd frontend && npm install && npm run build` → genera `frontend/dist`.
- Con esto todo queda en **un solo proceso** (`localhost:3001`), sin necesidad de correr Vite ni el proxy `/api`.

> Nota: en modo dev normal (`npm run dev` del frontend) esto no interfiere — `frontend/dist` solo existe si se corrió `npm run build`, y el dev server de Vite sigue usándose aparte con su propio proxy.

## 7. Arranque para uso diario (sin terminal)

Crear un `.bat` en el escritorio:

```bat
@echo off
docker start sueldos_db
cd /d C:\sig\backend
start "" cmd /k npm start
timeout /t 3
start http://localhost:3001
```

Si en vez de modo producción se deja modo dev, agregar también `npm run dev` del frontend en `C:\sig\frontend` y abrir `localhost:3000`.

## 8. Verificación

- `docker ps` → contenedor `sueldos_db` healthy.
- Login/navegación básica, abrir un informe con datos reales, para confirmar que el dump restauró bien.
