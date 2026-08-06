# Documentación de pantallas — Sistema Nacional

Relevamiento del sistema original (capturas en `original/pantallas.docx`).

---

## Estructura general

- Aplicación de escritorio (Windows)
- **Empresa activa** mostrada en la barra de título
- **Panel izquierdo**: módulos disponibles (Contabilidad, Sueldos, I.V.A.) + Administración
- **Barra de menú horizontal**: navegación principal del módulo Sueldos
- **Acciones favoritas**: accesos directos configurables (Administrar Empresas, Copia de Seguridad)

---

## Menú principal — Módulo Sueldos

### Empleados

| Ítem | Atajo |
|------|-------|
| Empleado | Ctrl+E |
| Listado de empleados | — |
| Convenio | Ctrl+C |
| Listado de convenios | — |
| Obra Social | — |
| Listado de obras sociales | — |
| Sindicato | — |
| Listado de sindicatos | — |
| Tablas AFIP ▶ | submenu |

**Tablas AFIP (submenu):**
- Situación de Revista
- Condición
- Actividad
- Modalidad de Contratación
- Incapacidad
- Código de Zona

---

### Conceptos

| Ítem |
|------|
| Concepto |
| Listado de conceptos |
| Fórmula |
| Listado de fórmulas |
| Grupo de Conceptos |
| Listado de grupos de conceptos |
| Grupo General de Conceptos |
| Clases de Concepto |
| Tabla |
| Tipo de Tabla |

---

### Liquidaciones

| Ítem | Atajo |
|------|-------|
| Liquidación | Ctrl+L |
| Recibo | Ctrl+R |
| Recibos Automáticos | — |
| Recibos Recalculados | — |
| Listado de recibos | — |
| Listado de contribuciones | — |
| Listado de auxiliares | — |
| Eliminación masiva | submenu |

---

### Novedades

| Ítem |
|------|
| Novedad |
| Listado de novedades |
| Novedades por Tabla |
| Novedades Secuenciales |
| Novedades Automáticas |
| Tipo de Novedad |
| Eliminar novedades |

---

### Historial

| Ítem |
|------|
| Historial |
| Listado de historiales |
| Historial de Empleado |
| Listado de historiales de empleados |
| Historiales Automáticos de empleados |
| Campo de Historial |
| Eliminar historiales |
| Eliminar historiales de empleados |

---

### Asistencia

| Ítem |
|------|
| Motivo de Ausentismo |
| Listado de motivos de ausentismos |
| Ausentismo |
| Listado de ausentismos |
| Presentismo |
| Presentismo Reloj |
| Listado de presentismos |
| Jornada Laboral |
| Listado de Jornadas Laborales |
| Feriado |

---

### Informes

| Ítem |
|------|
| Recibos de Sueldo |
| Libro de Sueldos |
| Diseño de Recibos de Sueldo |
| Diseño de Libro de Sueldos |
| Recibos Agrupados por Período |
| Recibos Agrupados por Empleado |
| Remuneración por Conceptos |
| Remuneración por Empleados |
| Remuneración por Grupos |
| Conceptos por Grupos |
| Conceptos Acumulados |
| Conceptos por Empleado |
| Conceptos por Recibo |
| Informes Personalizados |
| Diseño de Informes Personalizados |
| Acumulado de Novedades |
| Historial Acumulado por Días |
| Ausentismo Mensual |
| Ausentismo Mensual Empleados |
| Porcentaje de Ausentismo Mensual |
| Cantidad de Horas Trabajadas |

---

### Exportación

| Ítem | Atajo |
|------|-------|
| Exportación de Archivos | Ctrl+E |
| Formato de Exportación de Archivos | — |
| Importación de Novedades | — |
| Formato de Importación de Novedades | — |
| Importación de Empleados de AFIP | — |
| Exportación de Asientos a Contabilidad | — |
| Fórmula de Asiento | — |
| Exportación de Conceptos | — |
| Exportación de Fórmulas | — |
| Exportación de Convenios | — |
| Exportación de Grupo de Conceptos | — |
| Exportación de Tablas de Conceptos | — |
| Actualización de Sueldos | — |
| Exportación de Tablas | — |

### Tablas Comunes

_(ítems no visibles en las capturas — pendiente de relevamiento)_

---

## Pantallas relevadas

### Listado de Empleados

**Filtros disponibles:**

| Filtro | Tipo |
|--------|------|
| Legajo | texto libre |
| Convenio | expresión (ABC, =ABC, \*ABC\*, A..Z, A?B\*C) |
| Grupo | expresión |
| Ingreso | fecha / rango (1/2000, >=2000, 2000..6/200) |
| Orden | numérico / rango (1..50, >=100, <500, 1\*,5?) |
| Categoría | expresión |
| Estado | expresión |
| Provincia | expresión / ubicación |

**Columnas de la tabla:**

| Columna | Notas |
|---------|-------|
| Empleado | nro de legajo |
| Apellido | |
| Nombre | |
| C.U.I.L. | formato 20-XXXXXXXX-X |
| Grupo | |
| Antigüedad | en años |
| Tarea | descripción del puesto |
| Sueldo | formato $-moneda |
| Edad | años |
| Orden | nro de orden interno |

**Comportamiento:**
- Filas en **rojo** = empleados egresados (con fecha de egreso)
- Pie de tabla: "Fila: N | Registros: 95"
- Barra de herramientas: filtro, búsqueda, exportar PDF, exportar Excel/grilla, imprimir, herramientas, ayuda, cerrar

---

### Listado de Obras Sociales

**Filtros:**

| Filtro | Tipo |
|--------|------|
| Obra Social | código |
| Descripcion | expresión |
| Orden | numérico / rango |

**Columnas:**

| Columna | Notas |
|---------|-------|
| Código | numérico (ej: 0, 109, 208, 100106) |
| Descripción | nombre completo de la obra social |
| Retención $ | monto fijo |
| Retención % | porcentaje |
| Aporte $ | monto fijo |
| Aporte % | porcentaje |
| Orden | |

---

## Pantallas pendientes de relevamiento

Las siguientes pantallas no aparecen en las capturas disponibles. Se listan para completar en el futuro:

- Formulario de Empleado (alta/edición)
- Formulario de Convenio
- Formulario de Obra Social
- Formulario de Sindicato
- Formulario de Liquidación
- Formulario de Recibo
- Formulario de Concepto / Fórmula
- Listado de Liquidaciones
- Listado de Recibos
- Listado de Convenios
- Listado de Sindicatos
- Administrar Empresas
- Configuración

---

## Notas de implementación

- El sistema original es una app de escritorio MDI (múltiples ventanas internas)
- El nuevo sistema será web (SPA con React + PrimeReact)
- La **empresa activa** debe ser seleccionable y visible en todo momento (equivale al título de ventana del sistema original)
- Los listados usan un patrón consistente: barra de herramientas + filtros colapsables + DataTable
- Las expresiones de filtro del sistema original (ABC, \*ABC\*, A..Z) se pueden reemplazar con filtros estándar de PrimeReact DataTable (contains, starts with, between, etc.)
- Los colores en filas (rojo = egresado) se pueden implementar con `rowClassName` en DataTable de PrimeReact
