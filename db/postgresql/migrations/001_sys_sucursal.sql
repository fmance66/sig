-- Crea la tabla sys_sucursal (sucursales por empresa)
-- Ejecutar manualmente contra la DB en ejecución:
--   docker exec -i sueldos_db psql -U sueldos -d sueldos < db/postgresql/migrations/001_sys_sucursal.sql

CREATE TABLE IF NOT EXISTS sys_sucursal (
    id              SERIAL PRIMARY KEY,
    empresa         VARCHAR(30) NOT NULL REFERENCES sys_empresa(id) ON DELETE CASCADE ON UPDATE CASCADE,
    sucursal        VARCHAR(100),
    nombre_fantasia VARCHAR(200),
    direccion       VARCHAR(200),
    localidad       VARCHAR(100),
    provincia       VARCHAR(50),
    cpa             VARCHAR(10),
    codigo_zona     VARCHAR(20),
    telefono        VARCHAR(50),
    email           VARCHAR(100),
    login           BOOLEAN DEFAULT FALSE,
    orden           INTEGER
);
