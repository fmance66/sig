# Sueldos

Aplicación de escritorio local para gestión de liquidación de sueldos y salarios.

## Stack

| Capa | Tecnología |
|------|------------|
| Base de datos | PostgreSQL 16 (Docker) |
| Backend | Node.js + Express (JavaScript) |
| Frontend | React + Vite + PrimeReact |

## Estructura de repositorios

```
sueldos/          ← este repo (raíz / documentación / db)
  planes/         ← documentos de planificación
  db/             ← docker-compose para PostgreSQL
backend/          ← repo separado: API REST Node + Express
frontend/         ← repo separado: React + PrimeReact
```

## Levantar la base de datos

```bash
cd db
docker compose up -d
```

## Desarrollo

### Primera vez

```bash
npm install          # instala concurrently en la raíz
npm run install:all  # instala dependencias de backend y frontend
```

### Levantar todo

```bash
npm run dev
```

Arranca backend (`:3001`) y frontend (`:3000`) en simultáneo con salida coloreada en la misma terminal.

También se pueden levantar por separado:

```bash
npm run backend    # solo el backend
npm run frontend   # solo el frontend
```

Cada repo tiene su propio README con detalles: `backend/README.md`, `frontend/README.md`.

## Estado actual

Proyecto en desarrollo. Backend con CRUD de empresas y empleados. Frontend en construcción.
