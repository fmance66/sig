# Imagen única de producción local: el backend sirve el build del frontend en :3001.
# No se construye a mano: deploy/empaquetar.ps1 compila el frontend e instala las
# dependencias del backend en el host y recién ahí corre el build. La imagen no hace
# RUN porque la red dentro de "docker build" falla en Docker Desktop (DNS de BuildKit).
# Las dependencias del backend son JS puro, así que instalarlas en Windows sirve igual.

FROM node:22-alpine3.24 AS node

# Se parte de postgres y no de node porque el backup/restauración desde la UI necesita
# pg_dump/psql de la misma versión mayor que el servidor (un pg_dump más nuevo genera
# SQL que la 16 rechaza). Misma versión de Alpine que la imagen de node, así su binario
# corre tal cual (libstdc++/libgcc ya vienen en la imagen de postgres).
FROM postgres:16-alpine3.24
COPY --from=node /usr/local/bin/node /usr/local/bin/node
WORKDIR /app/backend
COPY deploy/.build/backend/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/src ./src
COPY frontend/dist /app/frontend/dist
COPY db/migrate.js /app/db/migrate.js
COPY db/postgresql/migrations /app/db/postgresql/migrations

ENV HOST=0.0.0.0 \
    PORT=3001 \
    PG_DIRECTO=1
EXPOSE 3001
ENTRYPOINT []
CMD ["node", "src/server.js"]
