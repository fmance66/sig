# Backend — Sueldos API

Node.js + Express. Puerto `3001`.

## Arrancar

```bash
cd backend
npm install
npm run dev      # nodemon
# o
npm start        # node directo
```

Variables de entorno en `.env`:

```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sueldos
DB_USER=sueldos
DB_PASSWORD=sueldos123
FRONTEND_URL=http://localhost:5173
```

Base URL: `http://localhost:3001/api`

---

## Endpoints

### Health

#### `GET /health`

```json
{ "status": "ok", "db": "connected" }
```

---

### Empresas — `/empresas`

#### `GET /empresas`

Lista todas las empresas ordenadas por `orden`.

**Response 200**
```json
[
  {
    "id": "thompson_y_french_sa",
    "razon_social": "Thompson y French S.A.",
    "nombre_comercial": "Due",
    "cuit": "30-70980403-7",
    "condicion_iva": "",
    "actividad": "Fabricacion y expendio Helados",
    "inicio": null,
    "direccion": "Av. De Mayo 347",
    "localidad": "Ramos Mejia",
    "provincia": "Buenos Aires",
    "cpa": "1704",
    "telefono": "4654-6541",
    "email": "",
    "webpage": null,
    "observaciones": null,
    "login": false,
    "cloud": null,
    "orden": null
  }
]
```

> Campos excluidos: `logo` (BYTEA), `baja` (BYTEA), `mail_password`.

---

#### `GET /empresas/:id`

**Response 200** — mismo objeto que el ítem del listado.
**Response 404** `{ "error": "Empresa no encontrada" }`

---

#### `POST /empresas`

Crea una empresa nueva.

**Body** (JSON) — `id` requerido, resto opcional:
```json
{
  "id": "nueva_empresa",
  "razon_social": "Nueva Empresa S.R.L.",
  "cuit": "30-12345678-9",
  "condicion_iva": "INSCRIPTO",
  "direccion": "Av. Corrientes 1234",
  "localidad": "CABA",
  "provincia": "Buenos Aires",
  "cpa": "1043",
  "telefono": "11-1234-5678",
  "email": "info@nueva.com",
  "login": true,
  "orden": 10
}
```

**Response 201** — objeto empresa creado.
**Response 400** `{ "error": "id es requerido" }`
**Response 409** `{ "error": "Ya existe una empresa con ese id" }`

---

#### `PUT /empresas/:id`

Actualización parcial — solo actualiza los campos presentes en el body.

**Body** (JSON) — todos opcionales:
```json
{
  "razon_social": "Nombre Actualizado S.A.",
  "telefono": "11-9999-0000"
}
```

**Response 200** — objeto empresa actualizado.
**Response 404** `{ "error": "Empresa no encontrada" }`

---

#### `DELETE /empresas/:id`

**Response 204** — sin body.
**Response 404** `{ "error": "Empresa no encontrada" }`

---

### Empleados — `/empleados`

#### `GET /empleados`

Lista empleados. Acepta filtro por empresa.

**Query params**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `empresa` | string | ID de empresa (ej. `thompson_y_french_sa`) |

**Ejemplos**
```
GET /empleados                              → todos
GET /empleados?empresa=thompson_y_french_sa → solo Thompson
```

**Response 200**
```json
[
  {
    "id": "018",
    "apellido": "LOIACONO",
    "nombre": "José Domingo",
    "cuil": "20-10859247-9",
    "estado": "",
    "fecha_ingreso": "2008-09-01T03:00:00.000Z",
    "fecha_egreso": "2020-04-30T03:00:00.000Z",
    "sexo": "M",
    "empresa": "thompson_y_french_sa",
    "convenio": "CCT 273/96",
    "categoria": "MEDIO OFICIAL Y/O CA",
    "sueldo": "38171.000000000000",
    "liquidacion": "MENSUAL",
    "obra_social": null,
    "sindicato": null,
    "grupo_de_conceptos": null,
    "orden": 18
  }
]
```

> Listado devuelve campos principales. Para todos los campos usar `GET /empleados/:id`.

---

#### `GET /empleados/:id`

Detalle completo del empleado (sin campo `foto` BYTEA).

**Response 200**
```json
{
  "id": "018",
  "apellido": "LOIACONO",
  "nombre": "José Domingo",
  "cuil": "20-10859247-9",
  "grupo": "",
  "estado": "",
  "tarea": "Medio Oficial",
  "fecha_ingreso": "2008-09-01T03:00:00.000Z",
  "fecha_egreso": "2020-04-30T03:00:00.000Z",
  "fecha_antiguedad": "2001-01-02T03:00:00.000Z",
  "antiguedad": null,
  "sexo": "M",
  "fecha_nacimiento": null,
  "nacionalidad": "Argentina",
  "estado_civil": "CASADO",
  "tipo_documento": "DNI",
  "numero_documento": "10859247",
  "direccion": "",
  "localidad": "",
  "provincia": "",
  "cpa": "",
  "telefono": "",
  "email": "",
  "orden": 18,
  "convenio": "CCT 273/96",
  "categoria": "MEDIO OFICIAL Y/O CA",
  "sueldo": "38171.000000000000",
  "adicional": "0.0000",
  "auxiliar": "0.0000",
  "dias": null,
  "horas": null,
  "porcentaje": null,
  "jornada": "COMPLETA",
  "proporcional": false,
  "liquidacion": "MENSUAL",
  "moneda": null,
  "vacaciones": null,
  "obra_social": null,
  "sindicato": null,
  "proyecto": null,
  "empresa": "thompson_y_french_sa",
  "lugar_trabajo": null,
  "banco": null,
  "cuenta": null,
  "cbu": null,
  "grupo_de_conceptos": null,
  "observaciones": null
}
```

**Response 404** `{ "error": "Empleado no encontrado" }`

---

#### `POST /empleados`

**Body** (JSON) — `id` requerido, resto opcional:
```json
{
  "id": "120",
  "apellido": "GARCIA",
  "nombre": "Juan",
  "cuil": "20-33445566-7",
  "sexo": "M",
  "estado_civil": "SOLTERO",
  "tipo_documento": "DNI",
  "numero_documento": "33445566",
  "fecha_ingreso": "2024-03-01",
  "empresa": "thompson_y_french_sa",
  "convenio": "CCT 273/96",
  "categoria": "OFICIAL",
  "sueldo": 250000,
  "liquidacion": "MENSUAL",
  "orden": 120
}
```

**Valores permitidos por campo**

| Campo | Valores |
|-------|---------|
| `sexo` | `M`, `F`, `X` |
| `estado_civil` | `SOLTERO`, `CASADO`, `CONCUBINATO`, `DIVORCIADO`, `SEPARADO`, `VIUDO` |
| `jornada` | `COMPLETA`, `MEDIA`, `REDUCIDA` |
| `liquidacion` | `MENSUAL`, `JORNAL` |

**Response 201** — objeto empleado creado.
**Response 400** `{ "error": "id es requerido" }`
**Response 409** `{ "error": "Ya existe un empleado con ese id" }`

---

#### `PUT /empleados/:id`

Actualización parcial — solo los campos enviados se modifican.

**Body** (JSON) — todos opcionales:
```json
{
  "sueldo": 280000,
  "fecha_egreso": "2024-12-31",
  "observaciones": "Renuncia voluntaria"
}
```

**Response 200** — objeto empleado actualizado.
**Response 404** `{ "error": "Empleado no encontrado" }`

---

#### `DELETE /empleados/:id`

**Response 204** — sin body.
**Response 404** `{ "error": "Empleado no encontrado" }`

---

## Estructura del proyecto

```
backend/
  src/
    app.js              ← Express + middlewares
    server.js           ← listen
    config/
      db.js             ← pool pg
    routes/
      index.js          ← monta todas las rutas en /api
      health.js
      empresas.js
      empleados.js
    controllers/
      empresas.js
      empleados.js
    models/
      empresas.js       ← queries a sys_empresa
      empleados.js      ← queries a sld_empleado
```

## Códigos de error HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Creado |
| 204 | Eliminado (sin body) |
| 400 | Body inválido o campo requerido ausente |
| 404 | Recurso no encontrado |
| 409 | Conflicto (ID duplicado) |
| 500 | Error interno del servidor |
