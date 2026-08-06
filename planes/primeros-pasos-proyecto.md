# Primeros pasos del proyecto

## Stack definido

- **Base de datos**: PostgreSQL (Docker)
- **Backend**: Node.js + Express (JavaScript), repo propio
- **Frontend**: React + PrimeReact, repo propio (manejo de estado a definir sobre la marcha)
- **Entorno**: local, tipo escritorio, en una primera fase
- **Repos**: dos, separados en Git (`backend` y `frontend`)
- **Desarrollo día a día**: VS Code + Claude Code

---

## 1. PostgreSQL con Docker

Crear una carpeta separada `db/` (o dentro del backend) con un `docker-compose.yml` que levante Postgres.

**Pedido a Claude Code:**
> Creá un docker-compose.yml para levantar PostgreSQL 16 con usuario, password, base de datos llamada [nombre], puerto 5432 expuesto, y un volumen para persistir los datos.

---

## 2. Repo Backend (Node + Express)

**Pedidos a Claude Code:**
> Inicializá un proyecto Node con Express, estructura de carpetas src/routes, src/controllers, src/models, src/config. Agregá dotenv para variables de entorno.

> Configurá la conexión a PostgreSQL usando pg (o Prisma/Sequelize si preferís un ORM) con las credenciales del .env.

> Creá un endpoint de salud /api/health que devuelva OK y confirme conexión a la base.

> Agregá nodemon para hot-reload en desarrollo.

> Creá un .gitignore apropiado para Node (node_modules, .env, etc.).

**Pendiente de decidir:** ORM (Prisma vs Sequelize) o SQL directo con `pg`.
- *Sequelize*: transición más cómoda viniendo de Express clásico.
- *Prisma*: más moderno, pero con su propia sintaxis para aprender.

---

## 3. Repo Frontend (React + PrimeReact)

**Pedidos a Claude Code:**
> Creá un proyecto React con Vite. Instalá PrimeReact, PrimeIcons y PrimeFlex.

> Configurá un layout base con el tema de PrimeReact que prefiera, con un sidebar de navegación y un área de contenido.

> Creá un archivo de configuración para la URL base de la API (apuntando a http://localhost:3001 o el puerto que uses).

> Agregá axios (o fetch con un wrapper) para las llamadas al backend.

---

## 4. Primer circuito completo (validación fullstack)

Objetivo: confirmar que Postgres, Express y React se hablan correctamente antes de meterse con el modelo de datos real.

- **Backend**: un endpoint simple, por ejemplo `/api/usuarios` que devuelva datos de prueba desde Postgres.
- **Frontend**: una pantalla que consuma ese endpoint y lo muestre en una tabla de PrimeReact (`DataTable`).

Esto funciona como el "hola mundo" fullstack del proyecto.

---

## Próximos pasos (pendientes de definir)

- [ ] Elegir ORM para el backend (Sequelize / Prisma / SQL directo)
- [ ] Modelar el esquema de datos a partir de capturas, formularios y PDFs existentes
- [ ] Definir estrategia de manejo de estado en el frontend (Context, Zustand, TanStack Query, Redux Toolkit)
- [ ] Definir autenticación y roles de usuario
