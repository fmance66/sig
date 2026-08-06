# Base de datos — PostgreSQL 16 (Docker)

## Levantar el contenedor

```powershell
cd c:\_proyectos\Personales\sueldos\db
docker compose up -d
```

No hace falta crear la base ni el usuario manualmente. Al arrancar por primera vez con un volumen vacío, PostgreSQL:

1. Crea el usuario `sueldos` y la base `sueldos`
2. Ejecuta en orden los scripts de `postgresql/`:
   - `01_schema.sql` — crea todas las tablas
   - `02_migrate_data.sql` — carga de datos (ver estado abajo)

## Verificar que el esquema cargó

```powershell
docker exec -it sueldos_db psql -U sueldos -d sueldos -c "\dt sld_*"
```

Debería listar las 38 tablas `sld_`.

## Estado de los scripts

| Script | Estado |
|--------|--------|
| `01_schema.sql` | Listo — DDL completo |
| `02_migrate_data.sql` | Template — estructura lista, datos reales pendientes de migrar desde los dumps MySQL |

## Conexión

| Parámetro | Valor |
|-----------|-------|
| Host | `localhost` |
| Puerto | `5432` |
| Base | `sueldos` |
| Usuario | `sueldos` |
| Contraseña | `sueldos123` |

## Detener / resetear

```powershell
# Solo detener (preserva datos)
docker compose down

# Detener y borrar el volumen (resetea la base completa)
docker compose down -v
```
