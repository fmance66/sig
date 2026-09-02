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
| Columnas BYTEA: datos binarios | `COL_TYPES` marca 'X' → bytes reales, ver sección 11 |
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
(colisión). El script deriva un ID canónico del nombre de archivo, y desde el cambio
descripto en la sección 9, también un id numérico (el que termina en `sys_empresa.id`):

| Archivo fuente | ID MySQL original | ID canónico (solo nombre de archivo `*_pg.sql`) | `sys_empresa.id` numérico |
|----------------|-------------------|---------------------------|------------------|
| `icp sa_...sql` | `ICP SA` | `icp_sa` | `1` |
| `master_...sql` | `master` | `master` | `2` |
| `minucc luis_...sql` | `nacional` | `minucc_luis` | `3` |
| `minucci pablo_...sql` | `nacional` | `minucci_pablo` | `4` |
| `thompson y french sa_...sql` | `HELADERIA` | `thompson_y_french_sa` | `5` |
| `zurawski jorge hecto_...sql` | `nacional` | `zurawski_jorge_hecto` | `6` |

El número se asigna por orden alfabético de archivo (ver `assignEmpresaNumbers` en
`migrate-from-mysql.js`), así que se mantiene estable mientras no cambie el conjunto de
dumps en `db/mysql/data/`. Una empresa nueva creada desde la UI (no migrada) sigue la
secuencia a partir del último id migrado (ver sección 9.3).

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
2. Copiar los nuevos dumps a `db/mysql/data/`
3. Levantar el contenedor: `docker compose up -d`
   - Ejecuta `01_schema.sql` automáticamente (ya tiene los tipos corregidos, y desde la
     sección 9 también crea `sys_sucursal` — ya no hace falta el paso manual aparte)
4. Regenerar los SQL: `node db/migrate-from-mysql.js --all`
   - Además de los `*_pg.sql` por empresa, genera `zzz_setval_pg.sql` (sincroniza la
     secuencia de `sys_empresa.id` para que las empresas creadas desde la UI después de
     la carga sigan numerando a partir del último id migrado — ver sección 9.3)
5. Cargar cada archivo, en orden alfabético (así `zzz_setval_pg.sql` corre al final):
   ```powershell
   foreach ($f in Get-ChildItem db/postgresql/data/*_pg.sql | Sort-Object Name) {
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

**Actualización (2026-08-07)**: con el cambio de la sección 9, la fila duplicada que
causaba este bug ya no llega a insertarse (se descarta automáticamente en la migración),
así que este escenario no debería repetirse en una regeneración desde cero.

---

## 9. Cambio: `sys_empresa.id` pasa de string a numérico (INTEGER)

**Motivo**: tener ids de empresa legibles/numéricos en vez de strings arbitrarios
derivados del nombre del dump de origen (`icp_sa`, `thompson_y_french_sa`, etc.), que
además obligaban a escribirlos a mano al crear una empresa desde la UI.

### 9.1 Schema (`01_schema.sql`)

- `sys_empresa.id`: `VARCHAR(30)` → `SERIAL` (autoincremental).
- FKs actualizadas a `INTEGER`: `sys_empresa.empresa` (auto-referencia, agrupación por
  grupo económico), `sys_user.empresa`, `sld_empleado.empresa`, `sys_sucursal.empresa`.
- `sys_sucursal` (antes en `db/postgresql/migrations/001_sys_sucursal.sql`, que había que
  aplicar a mano) ahora se crea directamente en `01_schema.sql`, ya con `empresa INTEGER`.
  El archivo de migración queda solo como referencia histórica — no ejecutar.

### 9.2 `migrate-from-mysql.js`

Antes, el id de cada empresa era el string canónico derivado del nombre de archivo
(`canonicalId`), y las FKs se resolvían con un reemplazo de texto ciego: cualquier
literal `'<id original MySQL>'` en todo el INSERT se cambiaba por `'<id canónico>'`, sin
mirar en qué columna caía.

Con `id` numérico eso ya no alcanza (una FK necesita un número, no cualquier substring
coincidente), así que el reemplazo ahora es por columna:

- `EMPRESA_ID_COLUMNS` declara qué columnas de qué tablas guardan un id de empresa
  (`sys_empresa.id`, `sys_empresa.empresa`, `sys_user.empresa`, `sld_empleado.empresa`).
  Solo esas columnas se resuelven contra el mapa de ids — cualquier otro campo que
  coincida por casualidad con el string (ej. `sys_empresa.workspace`) ya no se toca (antes
  sí se tocaba, era un efecto colateral no buscado del reemplazo ciego).
- El id numérico de cada empresa se asigna por **orden alfabético de archivo**
  (`assignEmpresaNumbers`) — ver tabla actualizada en la sección 4.
- El mapa `id original MySQL → id numérico` se arma **por archivo**, no global: tres de
  los seis dumps comparten el mismo id de origen (`'nacional'`, ver sección 4), y como
  cada uno es una base MySQL independiente, esos strings no tienen relación entre sí. Un
  mapa global los confundiría entre sí (bug detectado y corregido durante esta migración,
  antes de aplicarla a la base real).
- Si una fila de `sys_empresa` tiene un `id` que no aparece en el mapa del archivo (el
  caso de la fila duplicada de la sección 8), la fila se descarta con un aviso por
  stderr en vez de insertarse con `id NULL` (que violaría la PK `NOT NULL`). Si es otra
  columna FK (`empresa`, auto-referencia) la que no resuelve, se guarda `NULL` — mismo
  criterio que ya tenía el schema (`ON DELETE SET NULL`).

### 9.3 Sincronización de la secuencia

Como los `*_pg.sql` insertan ids explícitos (1 a 6) en vez de dejar que `SERIAL` los
genere, hace falta sincronizar la secuencia después de cargarlos para que la próxima
empresa creada desde la UI no choque con esos ids. El script ahora genera un archivo
extra, `zzz_setval_pg.sql` (ordena último alfabéticamente, se carga en el mismo loop de
la sección 6):

```sql
SELECT setval('sys_empresa_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sys_empresa));
```

### 9.4 Backend y frontend

- `backend/src/models/empresas.js` / `controllers/empresas.js`: `create` ya no recibe
  `id` del cliente (lo genera Postgres); se validó `razon_social` en su lugar. Se sacó el
  manejo de `23505` (duplicado de PK) en el controller porque ya no puede pasar con id
  autogenerado.
- `backend/src/models/empleados.js`: el filtro `empresa` del listado pasó de
  `$1::varchar` a `$1::integer`, y se normaliza `''`/`undefined` a `null` antes de la
  query.
- `frontend/.../EmpresasPage.jsx`: se sacó el campo "ID" del formulario de alta (ya no
  existe, lo asigna la base) y la validación asociada.
- `backend/postman/Sueldos.postman_collection.json`: ejemplos actualizados con ids
  numéricos (`icp_sa` → `1`, `thompson_y_french_sa` → `5`, etc., según la tabla de la
  sección 4).

### 9.5 Aplicación

Este cambio se aplicó regenerando la base desde cero (sección 6) en vez de un `ALTER`
en caliente, porque los datos cargados hasta ahora eran de prueba y no definitivos.

---

## 10. Cambio: `sld_empleado.id` (legajo) pasa a `legajo` + `id` numérico

**Motivo**: `sld_empleado.id` era el legajo (string) y a la vez la PK global de la
tabla. Como todas las empresas conviven en una sola `sld_empleado`, dos empresas no
podían tener empleados con el mismo legajo (ej. las dos el legajo `"1"`), algo que en
el sistema original sí era válido porque cada empresa tenía su propia base MySQL. Mismo
patrón que la sección 9 (`sys_empresa`), aplicado acá.

### 10.1 Schema (`01_schema.sql`)

- `sld_empleado`: el viejo `id VARCHAR(20) PRIMARY KEY` se separó en dos columnas:
  `id SERIAL PRIMARY KEY` (nuevo, autoincremental, es lo que referencian el resto de las
  tablas) y `legajo VARCHAR(20) NOT NULL` (el valor que antes era el id). Se agregó
  `UNIQUE (empresa, legajo)` — el legajo es único *dentro de una empresa*, no global.
- Las **14 tablas** que tenían `empleado VARCHAR(20) REFERENCES sld_empleado(id)` (o,
  en el caso de `sld_empleado_field`, la columna `entity`) pasan a `INTEGER`:
  `sld_empleado_afip`, `sld_empleado_concepto`, `sld_empleado_field` (columna `entity`),
  `sld_familiar`, `sld_jornada_laboral`, `sld_horario` (FK indirecta, vía
  `sld_jornada_laboral.empleado`), `sld_ausentismo`, `sld_presentismo`, `sld_novedad`,
  `sld_historial_empleado`, `sld_recibo`, `sld_recibo_concepto` (FK indirecta, vía
  `sld_recibo`), `sld_recibo_empleado`, `sld_recibo_afip`.

### 10.2 `migrate-from-mysql.js`

- El mecanismo de resolución de ids de la sección 9 (antes específico de `sys_empresa`,
  con la constante `EMPRESA_ID_COLUMNS`) se generalizó a `ID_RESOLVERS`, que ahora
  declara dos resolutores independientes — `empresa` y `empleado` — cada uno con su
  propio mapa de ids y su propia lista de columnas críticas (donde un id sin resolver
  descarta la fila entera) vs. nullables (donde se guarda `NULL`). Para `empleado`,
  **las 15 columnas son críticas**: todas son PK o parte de una PK compuesta, así que
  nunca se guarda `NULL` ahí — la fila se descarta si el legajo no resuelve.
- El id numérico de empleado se asigna con un **contador global** que sigue creciendo a
  través de todos los archivos (a diferencia del id de empresa, que es "uno por
  archivo"): como `sld_empleado` es una sola tabla compartida, cada empleado migrado
  necesita un id único en toda la base, sin importar de qué empresa venga.
- El **mapa legajo → id, en cambio, se arma por archivo** (`buildEmpleadoIdMaps`), por
  el mismo motivo que los ids de empresa en la sección 9: el legajo es único dentro de
  una base MySQL pero no entre ellas (dos empresas distintas pueden tener ambas un
  empleado con legajo `"1"`, sin relación entre sí).
- `sld_empleado`: la columna `id` del dump MySQL (el legajo original) se preserva tal
  cual en una columna nueva `legajo` que se inserta al lado de `id` en el INSERT
  generado; `id` pasa a llevar el id numérico nuevo. Ver `transformInsert` — busca la
  posición de `id` en las columnas de MySQL y duplica el valor original sin convertir
  junto al valor convertido.
- **Bug de parseo encontrado y corregido en el camino**: `splitTuples` (separa cada
  tupla de un `VALUES (...), (...), ...`) contaba paréntesis a ciegas, sin saber si
  estaba dentro de un string. Una foto de empleado guardada como BYTEA en el dump de
  `master` contiene bytes `(`/`)` como parte de los datos binarios del PNG, lo que
  cortaba la tupla siguiente en el lugar equivocado y perdía o corrompía filas. Se
  corrigió para que `splitTuples` salte los strings completos (con el mismo escaping de
  MySQL que ya usaba `parseValueTokens`) sin contar paréntesis dentro de ellos. Esto
  **recuperó empleados que la migración anterior perdía silenciosamente**: el total pasó
  de 119 a 123 (`master` +1, `minucci_pablo` +1, `zurawski_jorge_hecto` +2). Si se
  vuelve a tocar el parser, tener en cuenta que cualquier columna BYTEA puede traer bytes
  arbitrarios, no solo paréntesis.
- Relacionado con lo anterior: si **todas** las tuplas de un INSERT se descartan (por
  ids sin resolver), el `VALUES` queda vacío, lo cual es SQL inválido
  (`VALUES  ON CONFLICT ...`). `transformInsert` ahora detecta ese caso y omite el
  statement completo en vez de emitirlo roto.
- **Dato huérfano encontrado en el dump de `thompson y french sa`**: `sld_ausentismo`,
  `sld_familiar`, `sld_novedad`, `sld_empleado_afip` y `sld_recibo_concepto` tenían
  registros con `empleado = '2'`, un legajo que no existe en el `sld_empleado` de ese
  mismo dump (fue borrado directamente en MySQL alguna vez, sin borrar en cascada sus
  hijos). Con el id numérico esas 395 filas se descartan automáticamente (advertencia
  por stderr) en vez de fallar la carga por violar una FK — no hay nada para arreglar,
  es basura preexistente en el dump de origen.

### 10.3 Backend y frontend

- `backend/src/models/empleados.js`: `legajo` se agregó a `MUTABLE`/`DETAIL_COLS`/
  `LIST_COLS`; `create` ya no antepone `id` a las columnas (lo genera Postgres).
- `backend/src/controllers/empleados.js`: `create`/`update` validan y devuelven error
  409 sobre `legajo` en vez de `id`; el mensaje de conflicto (`23505`) ahora es "ya
  existe un empleado con ese legajo en esta empresa" (antes no podía pasar por PK
  duplicada, ahora es la constraint `UNIQUE(empresa, legajo)`).
- `frontend/.../EmpleadosPage.jsx`: el campo "Legajo" del formulario pasó de
  `name="id"` (solo visible al crear) a `name="legajo"` (visible y editable siempre,
  como cualquier otro campo). Tras crear un empleado, el id numérico para la pestaña LSD
  y el resto de las sub-tablas (Conceptos, Familiares, Novedades, Historial) se toma de
  la respuesta del POST (`res.data.data.id`), no del legajo tipeado. La columna "Legajo"
  de la grilla pasó de `field="id"` a `field="legajo"`.
- `backend/postman/Sueldos.postman_collection.json`: los ejemplos que usaban el legajo
  `"018"` (en URLs y bodies de empleados/familiares/novedades/historial/conceptos) se
  reemplazaron por el id numérico `1`; el body de alta de empleado pasó de `"id": "999"`
  a `"legajo": "999"`.

Las tablas `sld_empleado_concepto`, `sld_concepto_de_grupo` y `sld_concepto_general` no
tienen PK propia (solo `UNIQUE`, ver nota de `der-sueldos.md`) — no se tocaron acá más
allá de que su columna `empleado`/`grupo_de_conceptos` ya era la correcta en cada caso.

### 10.4 Aplicación

Igual que la sección 9: se regeneró la base desde cero (sección 6) en vez de un `ALTER`
en caliente.

---

## 11. Columnas BYTEA (logo de empresa, foto de empleado) — de NULL a bytes reales (2026-08-28)

**Motivo**: hasta ahora `migrate-from-mysql.js` descartaba `sys_empresa.logo`,
`sys_empresa.baja` y `sld_empleado.foto` como `NULL` a propósito (`COL_TYPES` las
marcaba `'X'`). Al actualizar los dumps se detectó que el logo de Thompson y French
sí tiene datos reales y que el PDF de recibos (`backend/src/pdf/disenoComun.js` →
`logoDataUri`) ya está preparado para usarlo — descartarlo dejaba ese hueco vacío en
el diseño sin necesidad.

### 11.1 Lectura/escritura del dump: de 'utf8' a 'latin1' (passthrough de bytes)

Preservar bytes binarios reales (una imagen) es incompatible con decodificar el
archivo completo como UTF-8 (el fix de la sección 7): cualquier byte inválido como
UTF-8 se reemplaza por el carácter de reemplazo `U+FFFD`, perdiendo la información
original sin posibilidad de recuperarla.

Se cambió la lectura de los dumps (`processDump`, `buildEmpleadoIdMaps`) de `'utf8'` a
`'latin1'` — mapea cada byte 1:1 a un char JS (0-255), sin interpretar nada. Como los
delimitadores relevantes (`,`, `(`, `)`, `'`, `\`) son siempre ASCII y nunca aparecen
como parte de una secuencia UTF-8 multibyte, el parseo de estructura (tuplas, tokens)
sigue funcionando igual que antes. La escritura de los `*_pg.sql` también pasó de
`'utf8'` a `'latin1'`, para que el mismo passthrough se mantenga hasta el archivo de
salida — el resultado son los mismos bytes UTF-8 originales, sin re-codificar.

**Efecto colateral corregido**: `VARCHAR_LIMITS` truncaba por `.length` de la string;
con lectura `latin1` eso pasa a truncar por *byte* en vez de por carácter Unicode, con
riesgo de cortar un carácter acentuado a la mitad. Se agregó `trimIncompleteUtf8()` que
recorta bytes de continuación UTF-8 sueltos al final para no dejar una secuencia
inválida.

### 11.2 `parseValueTokens`: bytes reales en paralelo al string ya escapado

Ahora devuelve `{ tokens, rawBytes }` en vez de solo `tokens`. `tokens` sigue siendo el
string ya listo para Postgres (igual que antes). `rawBytes[i]` es un `Buffer` con los
bytes reales de cada string literal — reconstruidos desunescapando los códigos de
MySQL (`\0`→0x00, `\n`→0x0A, `\r`→0x0D, `\Z`→0x1A, `\'`→0x27, `\\`→0x5C, etc., ver
`MYSQL_ESCAPES`). Ya no existe el sentinel `'__BINARY__'` que antes colapsaba
cualquier contenido con bytes de control a un valor descartable — se limpiaron sus
usos en `resolveIdToken`/`convertTokens`/`unquoteToken`.

`convertTokens` recibe `rawBytesArr` y, para columnas `COL_TYPES` `'X'`, arma el
literal real con `bytesToBytea()` (formato hex de Postgres vía `E'\\x...'`) en vez de
devolver `'NULL'`.

### 11.3 Bug encontrado: backticks borrados dentro de binarios

`transformInsert` hacía `line.replace(/\`/g, '')` sobre la línea completa (pensado
para sacar los backticks de `` `tabla` ``/`` `columna` `` de MySQL) — pero eso también
borraba cualquier byte crudo `0x60` (backtick) dentro de un blob binario en la sección
`VALUES`. Invisible mientras el BYTEA se descartaba siempre; al preservarlo, un PNG de
~70KB tiene ese byte cientos de veces (confirmado con validación CRC32 chunk por chunk
del PNG: fallaba antes del fix, año pasó a validar 100% después). Se acotó el
`replace` a la porción de la línea antes de `' VALUES '` únicamente.

### 11.4 Bug encontrado: BIT(1) llega como byte crudo, no como carácter ASCII

Columnas `BOOLEAN` en MySQL `BIT(1)` (ej. `sld_recibo.mail`/`.visible`) vuelcan su
valor como **un byte crudo** (`0x00`/`0x01`), no como el carácter `'0'`/`'1'`. El
código viejo las mandaba por la rama `hasBinary`→`'__BINARY__'`→`NULL` (resultado
incorrecto — debería ser `TRUE`/`FALSE`, pero al menos no rompía el INSERT). Al sacar
esa rama, el byte crudo (ej. `0x01`) quedaba tal cual dentro del string de salida →
`ERROR: invalid input syntax for type boolean`. Fix en `convertTokens`: para columnas
`'B'`, si hay `rawBytes` de 1 byte, usar su valor numérico (`0`→`FALSE`, cualquier otro
→ `TRUE`); si es de 0 bytes (string vacío genuino), `FALSE`; si no hay `rawBytes`
(token numérico sin comillas), sigue la lógica vieja de comparar contra `'0'`/`'1'`.

### 11.5 Empresa duplicada como "donante" del logo (caso Thompson y French)

El dump de Thompson y French trae, como ya documentaba la sección 8, dos filas de
`sys_empresa` para la misma empresa: la real (`id='HELADERIA'`, la que tiene los
empleados y sobrevive con `sys_empresa.id=5`) y una fantasma duplicada
(`id='thompson y french sa'`) que se descarta a propósito para no resucitar el bug de
borrado en cascada. Resultó que **el logo está cargado en la fila fantasma**, no en la
real — el resto de sus columnas están vacías o duplican la fila real.

`transformInsert` ahora, solo para `sys_empresa`, pre-escanea todas las tuplas del
INSERT antes de convertirlas: identifica filas cuyo `id` no resuelve contra el mapa de
empresa (candidatas a "fantasma") y que traen `logo`/`baja` con contenido real
(`empresaLogoDonors`). Al procesar la fila que sí sobrevive, si su propia
`empresa`(auto-referencia de "grupo económico") apunta al `id` de una fantasma
donante, y su propio `logo`/`baja` está vacío, se trasplanta el binario de la
donante antes de descartarla. Generalizado (no hardcodeado a Thompson), para que
aplique solo si el mismo patrón aparece en otra empresa a futuro.

Verificado con validación CRC32 de cada chunk PNG (`IHDR`, `sRGB`, `gAMA`, `pHYs`,
ambos `IDAT`, `IEND`) contra el valor esperado: los 73.707 bytes trasplantados
(comenzando en offset 89, con un header propietario tipo Delphi/VCL antes — ruta de
archivo + `\0ROOT\0...` — que no forma parte del PNG en sí) coinciden byte a byte con
el original.

### 11.6 Migraciones 002 y 003 plegadas en `01_schema.sql`

Al recrear la base con `docker compose down -v` + `up -d` (necesario para este cambio
de dump), se detectó que `sld_formulario_recibo`/`sld_formulario_libro` (y sus
`_parametro`) no existían — `docker-entrypoint-initdb.d` no recorre subcarpetas, así
que `postgresql/migrations/002_informes_formularios.sql` y
`003_formulario_parametro_estilo.sql` nunca se ejecutaban solos en una base nueva
(se habían aplicado a mano alguna vez sobre la base ya corriendo). Mismo criterio que
la sección 9.1 (migración 001/`sys_sucursal`): se plegaron ambas migraciones
directamente en `01_schema.sql` (sección 14, con las columnas de estilo de 003 ya
incluidas desde el CREATE), y los archivos de migración quedan marcados como
obsoletos/históricos.

### 11.7 Aplicación

Se regeneró la base desde cero (sección 6), con dos vueltas de
`docker compose down -v` + `up -d`: la primera para detectar el gap de las
migraciones 002/003, la segunda ya con `01_schema.sql` actualizado para que las
tablas de diseño de formularios se crearan solas.

---

## 12. Login y permisos — tablas app-native (sin fuente en MySQL)

Se agregó la sección 15 de `01_schema.sql` (`sys_grupo`, `sys_usuario`,
`sys_usuario_grupo`, `sys_permiso`, `sys_sesion`) para el sistema de login real +
permisos por módulo. A diferencia de todo lo demás en `01_schema.sql`, **estas
tablas no tienen ningún dump MySQL de origen** — son 100% nativas de la app nueva.

**Por qué no se reutilizó `sys_user`/`sys_group`/`sys_user_group`** (sección 1 del
schema, sí migradas desde MySQL): `sys_user.password` es `VARCHAR(20)` en texto
plano (credenciales del ERP legacy, nunca usadas por el backend actual — cero
referencias en `backend/src/`) y `sys_user.uid`/`sys_group.gid` son PK string,
rompiendo con el patrón `SERIAL` ya adoptado para entidades nuevas (secciones 9-10).
Mezclar login moderno con bcrypt sobre esas columnas hubiera sido más frágil que
partir de tablas nuevas en el mismo namespace `sys_`.

**Implicancia importante para la próxima vez que se repita la migración (sección
6)**: el `docker compose down -v` + `up -d` recrea `sys_usuario`/`sys_grupo`/etc.
solas (están en `01_schema.sql`, sobreviven a la recreación del *schema*), pero
**vacía sus datos** igual que cualquier otra tabla del volumen — no hay ningún dump
`*_pg.sql` que las repueble, porque no vienen de MySQL. La mitigación es el seed
idempotente al final de la sección 15: siempre queda un usuario `admin` (grupo
"Administradores", permiso total) recién levantada la base, mismo criterio que el
"root"/"Usuario Administrador" que traía sembrado el sistema legacy. Contraseña por
defecto `admin123` — cambiarla después del primer login. Cualquier otro
usuario/grupo/permiso creado desde la UI se pierde en una re-migración completa,
igual que hoy se pierde cualquier empresa/recibo cargado a mano — no se buildeó
un mecanismo de export/import para esto (fuera de alcance de lo pedido).

---

## 13. Recibo conforme a Ley 27.802 (Decreto 407/2026) — formato nuevo, sin fuente en MySQL

**Motivo**: el Anexo III del Decreto 407/2026 (reglamentario del nuevo art. 140 LCT,
Ley 27.802) exige un modelo de recibo con el costo laboral discriminado por categoría
(Sindical / Seguridad Social / Obra Social / INSSJP / ART / SCVO) y un gráfico que lo
represente. El ERP legacy (MySQL) es anterior a esta ley — no hay ningún dato, tabla
ni diseño de recibo de origen que cubra este formato.

**Qué se agregó**:
- `backend/src/services/costoLaboralLey27802.js`: agrupa `sld_recibo_concepto` por
  categoría legal, cruzando contra los flags booleanos de `sld_concepto_lsd`
  (`contribucion_*`/`aporte_*`, ya migrados en la sección 1 vía `COL_TYPES` — ver
  `sld_concepto_lsd: posiciones 2-21 todas BOOLEAN`). Como ese esquema legacy no tiene
  columnas dedicadas a "Sindical" ni "SCVO" (piensa en SICOSS, que no las contempla),
  se reutilizan los dos slots genéricos que sí trae: **`libre1` = Sindical, `libre2` =
  SCVO** — convención propia de esta feature, no algo que venga etiquetado así desde
  MySQL. Si se vuelve a tocar este archivo o se migran datos nuevos, tener en cuenta
  que `libre1`/`libre2` no son literalmente libres: ya tienen un significado asignado.
  Esta parte no tocó el schema — son columnas que ya estaban migradas.
- `backend/src/pdf/reciboLey27802.js`: documento PDF aparte de `reciboInterprete.js`
  (que sigue existiendo e interpreta los diseños por-empresa `sld_formulario_recibo`,
  ej. el formulario real "RECIBO_FIX" de Zurawski Jorge Héctor). Este, en cambio, es un
  layout fijo por ley — no hay nada para personalizar por empresa, así que no usa el
  motor de cajas x/y de `disenoComun.js`, se arma directo en flexbox. Sale **por
  duplicado** (ORIGINAL + DUPLICADO, una página A4 cada uno) con su propio renglón de
  firma — "Firma del empleado" en el original, "Firma del empleador" en el duplicado —
  misma convención de textos que ya usaban los parámetros `FIRMA_EMPLEADO`/
  `FIRMA_EMPLEADOR` (condición `ORIGINAL`/`DUPLICADO`) del motor de cajas.

### 13.1 Integración al sistema de diseños por empresa (`sld_formulario_recibo.ley_27802`)

La primera versión de esta feature vivía aparte del todo: un botón propio en el
frontend y una ruta propia (`/recibos-sueldo/pdf-ley27802`) que siempre generaba este
formato, sin pasar por el mecanismo existente de "diseño activo por empresa". Se
corrigió para que fuera **un diseño más de la lista** en "Diseño de Recibos de Sueldo"
(junto a RECIBO, RECIBO_A4, RECIBO_FIX, HUSARES_4122), activable/desactivable por
empresa con el mismo checkbox "Activo" que ya existía — consistente con cómo funciona
el resto de ese módulo (ver sección "Diseño de Recibos de Sueldo" en
`project_modulo_informes` de la memoria de sesión).

**Columna nueva**: `sld_formulario_recibo.ley_27802 BOOLEAN NOT NULL DEFAULT FALSE`
(aplicada a la base activa y agregada a `01_schema.sql`). `TRUE` en el diseño activo de
una empresa le dice a `pdfInformes.js` que no interprete ese formulario con el motor de
cajas x/y — lo arma con el layout fijo de `reciboLey27802.js` en su lugar. Es la única
columna nueva de toda esta feature; todo lo demás (categorías, colores, textos) es
código de aplicación.

**Seed**: se insertó una fila `RECIBO_LEY_27802` (`ley_27802=TRUE`, `activo=FALSE`) por
cada una de las 6 empresas existentes al momento de este cambio (ids 1-6, ver sección
4), para que ya aparezca en el listado y cada empresa la pueda activar desde la UI sin
tener que crearla a mano primero. **No hay seed automático en `01_schema.sql`** (a
diferencia del admin de la sección 12): insertar ahí referenciaría ids de
`sys_empresa` que todavía no existen en ese punto de la carga (el schema corre antes
que los datos). Si se repite la migración desde cero (sección 6), después de cargar los
`*_pg.sql` volver a correr:
```sql
INSERT INTO sld_formulario_recibo (empresa, nombre, descripcion, orientacion, pagina, ley_27802, activo)
SELECT id, 'RECIBO_LEY_27802', 'Recibo Ley 27.802 (Decreto 407/2026)', 'VERTICAL', 'A4', TRUE, FALSE
FROM sys_empresa
ON CONFLICT (empresa, nombre) DO NOTHING;
```
Una empresa nueva creada desde la UI después de esto no la tiene — no existe
seed-on-create para ningún diseño en este módulo (todos son 100% manuales, "Agregar
formulario"), así que este caso sigue el mismo patrón que ya tenían RECIBO/RECIBO_FIX/etc.

**Backend**: `formulario.js` (factory compartida con `sld_formulario_libro`) agregó
`ley_27802` a `MUTABLE` — es inocuo para libro porque ese payload nunca trae esa clave
(el filtro de `MUTABLE` es data-driven). `routes/index.js` pasa `ley_27802` como
`extraColumn` solo en el router de recibo. `pdfInformes.js#streamRecibosPdf` ahora arma
las páginas de cada motor por separado (`reciboInterprete.js#paginasRecibo` /
`reciboLey27802.js#paginasRecibo`, ambos exportan el array de `<Page>` sin envolver en
`<Document>`) y las combina en un único `<Document>` — un mismo lote de recibos puede
mezclar empresas con distinto diseño activo (motor de cajas para unas, Ley 27.802 para
otras) sin generar dos PDFs. Se borraron la ruta/controller/servicio dedicados
(`/recibos-sueldo/pdf-ley27802`, `recibosLey27802Pdf`, `streamLey27802Pdf`) por quedar
redundantes: `/recibos-sueldo/pdf` ya cubre el caso.

**Frontend**: `RecibosSueldoPage.jsx` volvió a un solo botón "Descargar PDF" contra el
endpoint de siempre (`api.getReciboSueldoPdfUrl`) — el formato lo decide el diseño
activo de cada empresa, no el botón. `DisenoFormularioPage.jsx` agregó el checkbox
"Formato Ley 27.802 (Decreto 407/2026)" al alta/edición de formulario, visible solo con
`soportaActivo` (o sea, solo en la pantalla de Recibos, no en la de Libro) — cuando está
tildado, la sub-tabla de parámetros de posición se reemplaza por un aviso ("este formato
usa un diseño fijo por ley").

**Ajuste de layout (single-page A4 por copia)**: la primera versión no entraba en una
página con datos reales — el peor caso real de la base (33 líneas de concepto que
efectivamente cruzan con `sld_concepto` — Thompson y French, empleado 142, período
03/2026; hay recibos con más filas en `sld_recibo_concepto` pero muchas no tienen
`columna` en REMUNERATIVO/NO_REMUNERATIVO/DESCUENTO/CONTRIBUCION y no se imprimen)
empujaba el bloque de detalle de categorías + gráfico de torta entero a una página 2,
aun con ~40% de la página 1 en blanco (es un efecto de `wrap: false` en React-pdf: si el
bloque completo no entra en el espacio restante, se mueve entero a la próxima página en
vez de recortarse). Se compactó paddings/márgenes/tamaños de fuente en todo el
documento hasta que ese peor caso entra en una sola página — verificado renderizando
contra la base real (no casos inventados) para 18 recibos de 3 empresas distintas, y
confirmado de nuevo después de agregar el duplicado + firma (cada copia sigue
entrando en su propia página).
