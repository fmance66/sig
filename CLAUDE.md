# CLAUDE.md — Proyecto Sueldos

Contexto para Claude Code sobre este proyecto.

## Qué es este proyecto

Aplicación local de gestión de sueldos y salarios. Entorno de escritorio, primera fase sin autenticación compleja.

## Stack definido

- **DB**: PostgreSQL 16 vía Docker Compose (`db/docker-compose.yml`)
- **Backend**: Node.js + Express, JavaScript (no TypeScript), repo `backend/`
- **Frontend**: React + Vite + PrimeReact + PrimeIcons + PrimeFlex, repo `frontend/`
- **HTTP client**: axios en el frontend
- **Puerto API**: `http://localhost:3001`

## Estructura del workspace

```
sueldos/                    ← raíz global (docs, infra, datos)
  db/
    docker-compose.yml      ← levanta PostgreSQL 16 (usuario: sueldos / sueldos123)
    postgres/               ← DDL y scripts de migración
  data/
    original/backup/        ← dumps MySQL originales (5 empresas + master)
    docs/                   ← DER (der-sueldos.md, der-sueldos.html)
  planes/                   ← documentos de planificación
  backend/                  ← repo git propio: Node + Express (puerto 3001)
  frontend/                 ← repo git propio: React + Vite (puerto 5173)
```

## Estructura del backend (`backend/`)

```
src/
  app.js          ← Express + middlewares
  server.js       ← listen
  config/db.js    ← pool de conexión pg
  routes/         ← rutas Express
  controllers/    ← lógica de negocio
  models/         ← queries a la DB
```

## Estructura del frontend (`frontend/`)

```
src/
  main.jsx        ← entry point, imports PrimeReact theme
  App.jsx
  layout/         ← AppLayout con Menubar
  pages/          ← una carpeta por pantalla
  components/     ← componentes reutilizables
  api/client.js   ← axios apuntando a /api (proxy → localhost:3001)
```

## Decisiones pendientes

- **ORM**: Sequelize / Prisma / `pg` directo (no decidido aún — preguntar antes de proponer uno)
- **Estado frontend**: Context / Zustand / TanStack Query / Redux Toolkit (no decidido)
- **Autenticación y roles**: a definir en fase posterior
- **Esquema de datos**: a modelar a partir de capturas, formularios y PDFs existentes

## Convenciones

- JavaScript (no TypeScript) en el backend
- Comentarios en código: solo cuando el "por qué" no es obvio
- No agregar abstracciones ni features no pedidos

## Primer circuito de validación planeado

Backend: `/api/usuarios` con datos de prueba desde Postgres.
Frontend: DataTable de PrimeReact consumiendo ese endpoint.
Objetivo: confirmar que los tres componentes se hablan antes de modelar datos reales.
