import './AyudaPage.css';

function Section({ icon, title, children }) {
  return (
    <section className="ayuda-section">
      <h2 className="ayuda-section-title">
        <i className={icon} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function ModuleCard({ icon, title, badge, items }) {
  return (
    <div className="modulo-card">
      <div className="modulo-card-header">
        <i className={icon} />
        <span className="modulo-card-name">{title}</span>
        {badge && <span className="modulo-card-badge">{badge}</span>}
      </div>
      {items && (
        <ul className="modulo-card-list">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function AyudaPage() {
  return (
    <div className="ayuda-page">
      <header className="ayuda-header">
        <i className="fa-solid fa-circle-question ayuda-header-icon" />
        <div>
          <h1 className="ayuda-header-title">Ayuda del Sistema</h1>
          <p className="ayuda-header-sub">Sistema Integrado de Gestión — SIG</p>
        </div>
      </header>

      <div className="ayuda-body">

        <Section icon="fa-solid fa-rocket" title="Primeros pasos">
          <ol className="ayuda-steps">
            <li>
              <span className="step-num">1</span>
              <div>
                <strong>Seleccioná una empresa</strong>
                <p>Hacé clic en el selector de empresa ubicado en la esquina superior derecha del encabezado. Se mostrará la lista de empresas disponibles.</p>
              </div>
            </li>
            <li>
              <span className="step-num">2</span>
              <div>
                <strong>Elegí un módulo</strong>
                <p>En el panel izquierdo aparecerán los módulos disponibles. Hacé clic en el módulo con el que querés trabajar.</p>
              </div>
            </li>
            <li>
              <span className="step-num">3</span>
              <div>
                <strong>Navegá por el menú superior</strong>
                <p>Al seleccionar un módulo se despliega una barra de menú en la parte superior con todas las secciones disponibles.</p>
              </div>
            </li>
          </ol>
        </Section>

        <Section icon="fa-solid fa-cubes" title="Módulos">
          <div className="modulos-grid">
            <ModuleCard
              icon="fa-solid fa-briefcase"
              title="Sueldos"
              items={[
                'Empleados: alta, baja y modificación del personal',
                'Convenios colectivos de trabajo',
                'Obras sociales y sindicatos',
                'Liquidaciones y recibos de sueldo',
                'Conceptos: haberes, descuentos, aportes y contribuciones',
                'Novedades: variaciones salariales y licencias',
                'Historial laboral y asistencia',
                'Informes y exportaciones AFIP',
              ]}
            />
            <ModuleCard
              icon="fa-solid fa-book-open"
              title="Contabilidad"
              items={[
                'Plan de cuentas, centros de costo y leyendas',
                'Ejercicios contables',
                'Asientos: carga, unión, renumeración y asientos modelo',
                'Informes: Mayor de Cuentas, Balance General, Balance de Sumas y Saldos, Libro Diario',
              ]}
            />
            <ModuleCard
              icon="fa-solid fa-percent"
              title="I.V.A."
              items={[
                'Comprobantes de compra y venta',
                'Proveedores y clientes',
                'Períodos de liquidación',
                'Informes: Libro de I.V.A., Resumen I.V.A., Declaración Jurada',
              ]}
            />
          </div>
        </Section>

        <Section icon="fa-solid fa-gear" title="Configuración">
          <div className="ayuda-config-grid">
            <div className="ayuda-config-item">
              <i className="fa-solid fa-building" />
              <div>
                <strong>Empresas</strong>
                <p>Accedé desde <em>Config. → Empresas → Administrar empresas</em>. Podés registrar los datos de cada empresa incluyendo CUIT, domicilio, condición IVA y configuración de correo saliente.</p>
              </div>
            </div>
            <div className="ayuda-config-item">
              <i className="fa-solid fa-map-marker-alt" />
              <div>
                <strong>Sucursales</strong>
                <p>Dentro del formulario de cada empresa, en la pestaña <em>Sucursales</em>, podés registrar las distintas bocas de atención con su propia dirección y teléfono.</p>
              </div>
            </div>
            <div className="ayuda-config-item">
              <i className="fa-solid fa-envelope" />
              <div>
                <strong>Correo saliente</strong>
                <p>Configurá el servidor SMTP de cada empresa en la pestaña <em>E-mail</em> del formulario de empresa para habilitar el envío de recibos por correo electrónico.</p>
              </div>
            </div>
          </div>
        </Section>

        <Section icon="fa-solid fa-lightbulb" title="Consejos">
          <ul className="ayuda-tips">
            <li><i className="fa-solid fa-magnifying-glass" /> Usá el campo <strong>Buscar</strong> en las tablas para filtrar rápidamente por cualquier columna.</li>
            <li><i className="fa-solid fa-sort" /> Hacé clic en el encabezado de una columna para ordenar la tabla. Un segundo clic invierte el orden.</li>
            <li><i className="fa-solid fa-pen" /> El botón <strong>Modificar</strong> <em>(lápiz)</em> en la columna Acciones abre el formulario con los datos actuales de la fila.</li>
            <li><i className="fa-solid fa-trash" /> El botón <strong>Eliminar</strong> <em>(papelera)</em> pide confirmación antes de borrar el registro.</li>
          </ul>
        </Section>

      </div>
    </div>
  );
}
