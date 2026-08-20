import { SiteFooter, SiteHeader } from "../components/site-chrome";

const departments = [
  { code: "ADM", name: "ADMINISTRACIÓN", description: "Dirección del proyecto, infraestructura y decisiones generales.", members: ["KekeAdmin", "NexuZ"] },
  { code: "MOD", name: "MODERACIÓN", description: "Convivencia, reportes, apelaciones y aplicación del reglamento.", members: ["Asteria", "FrostByte", "Lunaris"] },
  { code: "EVT", name: "EVENTOS", description: "Torneos, drafts, transmisiones y coordinación competitiva.", members: ["Valken", "MiloPvP"] },
  { code: "DEV", name: "DESARROLLO", description: "Plugins, sitio web, estabilidad de red y nuevas funciones.", members: ["KairoDev", "Riven"] },
];

export default function StaffPage() {
  return (
    <main>
      <SiteHeader active="staff" />
      <section className="portal-hero staff-public-hero">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div>
          <p className="eyebrow"><span>EQUIPO OFICIAL</span> PERSONAS DETRÁS DE KEKE</p>
          <h1>EL STAFF.<br /><em>CON NOMBRE PROPIO.</em></h1>
        </div>
        <p>Conoce quién administra cada área y a qué equipo debes dirigirte cuando necesites soporte.</p>
      </section>

      <section className="public-staff-section">
        <div className="staff-lead">
          <div className="staff-lead-mark">K</div>
          <div><small>DIRECCIÓN DEL SERVIDOR</small><h2>KekeAdmin</h2><p>Responsable de la visión de KEKE Network, la coordinación del equipo y las decisiones de producto.</p></div>
          <a href="/staff/contenido">PANEL DE CONTENIDO</a>
        </div>

        <div className="department-grid">
          {departments.map((department, index) => (
            <article className="department-card" key={department.code}>
              <div className="department-head"><span>{String(index + 1).padStart(2, "0")}</span><strong>{department.code}</strong></div>
              <h3>{department.name}</h3>
              <p>{department.description}</p>
              <div className="member-list">
                {department.members.map((member) => <span key={member}>{member}</span>)}
              </div>
            </article>
          ))}
        </div>

        <div className="staff-apply">
          <div><small>POSTULACIONES</small><h2>¿QUIERES FORMAR PARTE?</h2><p>Las convocatorias se anuncian únicamente en NEWS. Nunca solicitamos pagos para entrar al equipo.</p></div>
          <a href="/news">VER CONVOCATORIAS</a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
