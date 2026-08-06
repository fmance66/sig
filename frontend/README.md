# Frontend — Sueldos

React + Vite + PrimeReact. Puerto `5173`.

## Requisitos

- Node.js 18+
- Backend corriendo en `http://localhost:3001` (ver `backend/README.md`)
- PostgreSQL corriendo vía Docker (ver `db/README.md`)

## Arrancar

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Preview del build de producción |

## Proxy

Vite redirige `/api/*` → `http://localhost:3001` automáticamente.  
El cliente axios en `src/api/client.js` apunta a `/api`, no a localhost directamente.

## Stack

| Librería | Versión | Uso |
|----------|---------|-----|
| React | 18 | UI |
| Vite | 6 | Bundler + dev server |
| PrimeReact | 10 | Componentes UI |
| PrimeFlex | 3 | Utilidades CSS |
| PrimeIcons | 7 | Íconos |
| axios | 1.7 | HTTP client |

## Estructura

```
src/
  main.jsx          ← entry point, imports del tema PrimeReact
  App.jsx           ← rutas principales
  layout/
    AppLayout.jsx   ← Menubar + estructura general
  pages/            ← una carpeta por pantalla
  components/       ← componentes reutilizables
  api/
    client.js       ← axios apuntando a /api
```

## Documentación

- `docs/pantallas.md` — relevamiento del sistema original (menús, filtros, columnas)
- `docs/original/pantallas.docx` — capturas de pantalla del sistema actual
