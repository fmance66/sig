# Bitácora de migración MySQL 5.5 → PostgreSQL 16

Registro de todos los cambios realizados durante la migración de los dumps MySQL al esquema PostgreSQL.
Útil para volver a migrar datos actualizados sin perder ningún ajuste.

---

## 1. Arquitectura general

- **Origen**: 6 bases MySQL 5.5 independientes (una por empresa)
- **Destino**: una única base PostgreSQL 16 con todas las empresas conviviendo
- **Herramienta**: `db/migrate-from-mysql.js` — convierte dumps MySQL en SQL para PostgreSQL

---

## 2. Script de migración (`db/migrate-from-mysql.js`)

### Problemas resueltos y transformaciones aplicadas

| Problema | Solución en el script |
|----------|-----------------------|
| Identificadores con backticks MySQL | `line.replace(/\`/g, '')` global |
| Fechas `0000-00-00` | Reemplazadas por `NULL` |
| FK checks durante carga | `SET session_replication_role = replica` |
| Escaping MySQL `\'` rechazado por psql | `SET standard_conforming_strings = off` |
| Conflictos en datos de referencia compartidos | `ON CONFLICT DO NOTHING` en todos los INSERTs |
| Columnas BOOLEAN: MySQL guarda 0/1 o raw bits | `COL_TYPES` map + conversión 0→FALSE, 1→TRUE |
| Columnas BYTEA: datos binarios | `COL_TYPES` marca 'X' → se insertan como NULL |
| Valor `__BINARY__` en columnas BOOLEAN | Bug corregido: `tok === '__BINARY__'` retorna NULL en branch 'B' |
| Byte nulo `\0` (escape MySQL) | En `parseValueTokens`: `str[i+1] === '0'` → skip; también `.replace(/\\0/g, '')` global al final |
| Columnas NOT NULL que llegan en NULL | `NOT_NULL_DEFAULTS` map con defaults por tabla/columna |
| Columnas VARCHAR con datos más largos | `VARCHAR_LIMITS` map con truncado configurable |
| Orden de columnas diferente MySQL/PG | Parser de `CREATE TABLE` MySQL extrae nombres → INSERT con columnas explícitas |
| IDs de empresa duplicados ('nacional' × 3) | `canonicalId(filename)` desde nombre de archivo; sustitución global en el INSERT |
| INSERTs multi-línea (datos binarios BLOB) | Acumulación de líneas hasta `;` final |

### COL_TYPES (columnas con tipos especiales)
```javascript
sys_empresa:        { 11:'X', 20:'X', 29:'B', 30:'B', 33:'B' }
bas_importacion:    { 8:'B', 9:'B' }
bas_proyecto:       { 16:'B', 17:'B' }
sld_concepto:       { 7:'B', 10:'B', 12:'B', 14:'B', 20:'B' }
sld_concepto_lsd:   posiciones 2-21 todas BOOLEAN
sld_empleado:       { 24:'X', 35:'B' }
sld_recibo:         { 18:'B', 19:'B' }
sld_recibo_concepto:{ 11:'B', 12:'B', 13:'B' }
sld_informe:        { 6:'B' }
sld_informe_campo:  { 4:'B', 5:'B' }
```

### NOT_NULL_DEFAULTS
```javascript
sld_concepto_de_grupo:  { liquidacion: "'MENSUAL'", recibo: '0' }
sld_empleado_concepto:  { liquidacion: "'MENSUAL'", recibo: '0' }
sld_concepto_general:   { liquidacion: "'MENSUAL'", recibo: '0' }
```

### VARCHAR_LIMITS (truncado en migración)
```javascript
sld_actividad_laboral: { descripcion: 255 }
sld_liquidacion:       { lugar_pago: 100, periodo_deposito: 40, banco_deposito: 60 }
```

---

## 3. Cambios al schema DDL (`db/postgres/01_schema.sql`)

Todos los cambios al schema reflejan datos reales más anchos que los límites originales.
Aplicar estos mismos cambios en cualquier recreación desde cero.

**Nota (2026-08-06)**: algunos de los anchos abajo se calcularon sobre texto con mojibake
(ver sección 7, ya resuelto) y por lo tanto son más generosos de lo estrictamente necesario
ahora que el encoding está corregido. No hace falta achicarlos — son límites válidos, solo
más holgados de lo mínimo.

### 3.1 Columnas de obra social / sindicato

**Motivo**: valores como `'O.S. MECÁNICOS Y AFIN'` (21 chars en mojibake) superan VARCHAR(20).

```sql
ALTER TABLE sld_obra_social ALTER COLUMN id TYPE VARCHAR(30);
ALTER TABLE sld_sindicato   ALTER COLUMN id TYPE VARCHAR(30);
ALTER TABLE sld_empleado    ALTER COLUMN obra_social TYPE VARCHAR(30);
ALTER TABLE sld_empleado    ALTER COLUMN sindicato   TYPE VARCHAR(30);
ALTER TABLE sld_convenio    ALTER COLUMN obra_social TYPE VARCHAR(30);
ALTER TABLE sld_recibo_empleado ALTER COLUMN obra_social TYPE VARCHAR(30);
ALTER TABLE sld_recibo_empleado ALTER COLUMN sindicato   TYPE VARCHAR(30);
```

### 3.2 Localidad

**Motivo**: `bas_localidad.localidad` y `zona` con datos largos.

```sql
ALTER TABLE bas_localidad ALTER COLUMN localidad TYPE VARCHAR(100);
ALTER TABLE bas_localidad ALTER COLUMN zona       TYPE VARCHAR(60);
ALTER TABLE sld_empleado  ALTER COLUMN localidad  TYPE VARCHAR(100);
ALTER TABLE sys_empresa   ALTER COLUMN localidad  TYPE VARCHAR(100);
```

### 3.3 Actividad laboral

**Motivo**: `sld_actividad_laboral.descripcion VARCHAR(100)` superada por algunos valores.

```sql
ALTER TABLE sld_actividad_laboral ALTER COLUMN descripcion TYPE VARCHAR(255);
```

### 3.4 Liquidación

**Motivo**: `lugar_pago` con direcciones de ~41 chars; `periodo_deposito` con valores de ~21 chars por mojibake de caracteres acentuados.

```sql
ALTER TABLE sld_liquidacion ALTER COLUMN lugar_pago       TYPE VARCHAR(100);
ALTER TABLE sld_liquidacion ALTER COLUMN periodo_deposito TYPE VARCHAR(40);
ALTER TABLE sld_liquidacion ALTER COLUMN banco_deposito   TYPE VARCHAR(60);
```

### 3.5 Período de liquidación (PK y FKs)

**Motivo**: valores como `'Vac y 1Âº Quinc 02/18'` = 21 chars por mojibake de `º` (ordinal).

```sql
ALTER TABLE sld_liquidacion   ALTER COLUMN periodo       TYPE VARCHAR(30);
ALTER TABLE sld_recibo        ALTER COLUMN periodo       TYPE VARCHAR(30);
ALTER TABLE sld_recibo        ALTER COLUMN periodo_recibo TYPE VARCHAR(30);
ALTER TABLE sld_recibo_concepto ALTER COLUMN periodo     TYPE VARCHAR(30);
```

### 3.6 sld_tabla (tablas de parámetros)

**Motivo**: `column_N VARCHAR(20)` superada por nombres de columna con caracteres acentuados (ej. `'Retención Porcentaje'` = 21 chars en mojibake). También se amplió el PK `id` y el FK en `sld_fila`.

```sql
ALTER TABLE sld_tabla ALTER COLUMN id       TYPE VARCHAR(30);
ALTER TABLE sld_tabla ALTER COLUMN column_1 TYPE VARCHAR(50);
ALTER TABLE sld_tabla ALTER COLUMN column_2 TYPE VARCHAR(50);
ALTER TABLE sld_tabla ALTER COLUMN column_3 TYPE VARCHAR(50);
ALTER TABLE sld_tabla ALTER COLUMN column_4 TYPE VARCHAR(50);
ALTER TABLE sld_tabla ALTER COLUMN column_5 TYPE VARCHAR(50);
ALTER TABLE sld_tabla ALTER COLUMN column_6 TYPE VARCHAR(50);
ALTER TABLE sld_tabla ALTER COLUMN column_7 TYPE VARCHAR(50);
ALTER TABLE sld_tabla ALTER COLUMN column_8 TYPE VARCHAR(50);
ALTER TABLE sld_tabla ALTER COLUMN column_9 TYPE VARCHAR(50);
ALTER TABLE sld_fila  ALTER COLUMN tabla    TYPE VARCHAR(30);
```

---

## 4. IDs de empresa canónicos

Cada dump MySQL tenía su propio `id` en `sys_empresa`. Tres empresas usaban `'nacional'`
(colisión). El script deriva un ID canónico del nombre de archivo:

| Archivo fuente | ID MySQL original | ID canónico en PostgreSQL |
|----------------|-------------------|---------------------------|
| `icp sa_...sql` | `ICP SA` | `icp_sa` |
| `master_...sql` | `master` | `master` |
| `minucc luis_...sql` | `nacional` | `minucc_luis` |
| `minucci pablo_...sql` | `nacional` | `minucci_pablo` |
| `thompson y french sa_...sql` | `HELADERIA` | `thompson_y_french_sa` |
| `zurawski jorge hecto_...sql` | `nacional` | `zurawski_jorge_hecto` |

---

## 5. Resultado final

Migración completada exitosamente el 2026-08-04.

| Tabla | Registros |
|-------|-----------|
| `sld_empleado` | 119 |
| `sld_recibo` | 2461 |
| `sld_liquidacion` | 454 |
| `sld_concepto` | 245 |
| `sld_obra_social` | 387 |

---

## 6. Para repetir la migración (datos actualizados)

1. Detener y borrar el volumen: `docker compose down -v`
2. Copiar los nuevos dumps a `data/original/backup/`
3. Levantar el contenedor: `docker compose up -d`
   - Ejecuta `01_schema.sql` automáticamente (ya tiene los tipos corregidos)
4. Regenerar los SQL: `node db/migrate-from-mysql.js --all`
5. Cargar cada archivo:
   ```powershell
   foreach ($f in Get-ChildItem db/postgres/data/*_pg.sql) {
     docker cp $f.FullName sueldos_db:/tmp/load.sql
     docker exec sueldos_db psql -U sueldos -d sueldos -f /tmp/load.sql
   }
   ```
6. Si aparece un nuevo error `value too long for type character varying(N)`:
   - Identificar qué tabla/columna falla
   - Agregar el ALTER en `01_schema.sql` y en la sección 3 de este documento
   - Aplicar el ALTER en la base activa
   - No es necesario regenerar los SQL (el ALTER en la base ya resuelve el constraint)

---

## 7. Bug: mojibake en caracteres acentuados (RESUELTO 2026-08-06)

**Síntoma**: caracteres acentuados del español aparecían duplicados en toda la base
(ej. `á` → `Ã¡`, `ó` → `Ã³`, `º` → `Âº`, `José` → `JosÃ©`), visible tanto en la respuesta
de la API como en el frontend.

**Causa raíz**: `migrate-from-mysql.js` leía los dumps de MySQL (que ya están en UTF-8
válido, confirmado por la cabecera `SET NAMES utf8` de `mysqldump`) con el encoding
`'latin1'` y volvía a escribir el resultado como `'utf8'`. Cada carácter multibyte UTF-8
(ej. `é` = bytes `C3 A9`) se interpretaba como dos caracteres Latin-1 (`Ã©`) y al
reescribirse en UTF-8 esos dos caracteres se recodificaban a 4 bytes, duplicando el mojibake.
Ese texto ya corrupto era el que terminaba cargado en PostgreSQL vía `psql` — el
`server_encoding`/`client_encoding` del contenedor están correctamente en `UTF8`, no hay
transcodificación errónea ahí ni en el backend (`pg`/Express) ni en el frontend (`axios`);
el dato ya estaba mal guardado en la fila.

**Fix aplicado**:
- `migrate-from-mysql.js`: cambiado `fs.readFileSync(inputFile, 'latin1')` a
  `fs.readFileSync(inputFile, 'utf8')` (línea ~260).
- Eliminado `db/mysql/data/thompson_pg.sql`, un archivo espurio: una salida ya procesada
  (con el mojibake simple ya aplicado) que había quedado guardada dentro de la carpeta de
  dumps de origen y que, al volver a pasarse por el script, generó una segunda capa de
  corrupción (`db/postgresql/data/thompson_pg.sql_pg.sql`, también eliminado).
- Regenerados todos los `db/postgresql/data/*_pg.sql` con `node migrate-from-mysql.js --all`.
- Recargada la base: `TRUNCATE` de todas las tablas migradas (`RESTART IDENTITY CASCADE`)
  seguido de la recarga de los 6 `*_pg.sql` corregidos, en el mismo orden que la sección 6
  (`master` primero). Verificado con `SELECT ... WHERE campo LIKE '%Ã%'` en `sld_empleado`
  → 0 filas.

**Nota**: si se vuelve a ejecutar la migración desde dumps MySQL nuevos, no hace falta
ninguna acción especial — el script ya lee los dumps con el encoding correcto.

---

## 8. Bug: borrar una empresa borraba otra (self-referencing FK con CASCADE)

**Síntoma**: al borrar la empresa duplicada "Thompson y French" (la fila sin empleados,
id `thompson y french sa` con espacios) desde el listado, el sistema borró también la
fila real `thompson_y_french_sa` (la que tenía los 95 empleados vinculados).

**Causa**: `sys_empresa.empresa` es una FK auto-referenciada a `sys_empresa(id)`. En el
dump original de MySQL, la fila real (`thompson_y_french_sa`) tenía esa columna apuntando
a la fila duplicada (`thompson y french sa`) — probablemente un campo de agrupación/cloud
del sistema original, sin relación con la duplicación. Con `ON DELETE CASCADE`, borrar la
fila referenciada (la duplicada) arrastró a la fila que la apuntaba (la real).

**Fix aplicado**: se cambió esa constraint de `ON DELETE CASCADE` a `ON DELETE SET NULL`
en `01_schema.sql` y en la base activa (`ALTER TABLE sys_empresa ... DROP/ADD CONSTRAINT
sys_empresa_empresa_fkey`). Así, borrar una empresa nunca vuelve a borrar otra en cascada;
como máximo deja en NULL el campo `empresa` de la fila que la referenciaba.

**Recuperación de datos**: la fila `thompson_y_french_sa` se reinsertó a mano con los
valores originales del dump (`db/postgresql/data/thompson_y_french_sa_pg.sql`), sin
recrear la fila duplicada sin empleados. Los 95 empleados que quedaron con `empresa = NULL`
(por el `ON DELETE SET NULL` de `sld_empleado.empresa`, que nunca se llegó a borrar) se
re-vincularon con `UPDATE sld_empleado SET empresa='thompson_y_french_sa' WHERE empresa IS NULL`.

**Nota**: `sys_sucursal.empresa` también tiene `ON DELETE CASCADE` hacia `sys_empresa(id)`,
pero ese caso es intencional (una sucursal pertenece a una empresa) y no se modificó.
