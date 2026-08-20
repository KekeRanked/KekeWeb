import { SiteFooter, SiteHeader } from "../components/site-chrome";

const events = [
  { type: "TORNEO", date: "POR DEFINIR", title: "Primer Torneo Oficial", format: "Por anunciar", status: "PRÓXIMAMENTE", slots: "Por confirmar", accent: true },
  { type: "DRAFT", date: "POR DEFINIR", title: "Draft de Capitanes", format: "Equipos sorteados", status: "PRÓXIMAMENTE", slots: "Por confirmar", accent: false },
  { type: "TORNEO", date: "POR DEFINIR", title: "Duelo de Clanes", format: "5 contra 5", status: "PRÓXIMAMENTE", slots: "Por confirmar", accent: false },
];

export default function EventosPage() {
  return (
    <main>
      <SiteHeader active="eventos" />
      <section className="portal-hero event-hero">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div>
          <p className="eyebrow"><span>TEMPORADA BETA</span> CALENDARIO COMPETITIVO</p>
          <h1>ENTRA AL EVENTO.<br /><em>DEJA TU MARCA.</em></h1>
        </div>
        <p>Torneos organizados, drafts abiertos y formatos especiales con reglas publicadas antes de cada inscripción.</p>
      </section>

      <section className="events-section">
        <div className="events-overview">
          <div><small>PRÓXIMO EVENTO</small><strong>POR DEFINIR</strong><span>Será anunciado</span></div>
          <div><small>FORMATO</small><strong>POR DEFINIR</strong><span>Próximamente</span></div>
          <div><small>PREMIO TOTAL</small><strong>POR DEFINIR</strong><span>Próximamente</span></div>
          <div><small>REGISTRO</small><strong>—</strong><span>Aún no abierto</span></div>
        </div>

        <div className="section-title-row"><div><p className="eyebrow"><span>AGENDA</span> PRÓXIMAS FECHAS</p><h2>TORNEOS Y DRAFTS</h2></div><button type="button">VER EVENTOS FINALIZADOS</button></div>
        <div className="event-list">
          {events.map((event, index) => (
            <article className={event.accent ? "event-card is-featured" : "event-card"} key={event.title}>
              <div className="event-date"><span>{event.type}</span><strong>{event.date}</strong></div>
              <div className="event-detail"><small>{event.status}</small><h3>{event.title}</h3><p>{event.format}</p></div>
              <div className="event-capacity"><small>CUPO</small><strong>{event.slots}</strong></div>
              <button type="button">{index === 0 ? "INSCRIBIR EQUIPO" : "VER DETALLES"}</button>
            </article>
          ))}
        </div>

        <div className="event-process">
          <div><span>01</span><strong>Revisa el formato</strong><p>Cada evento publica requisitos, reglamento y horarios antes de abrir registros.</p></div>
          <div><span>02</span><strong>Registra tu equipo</strong><p>El capitán completa la inscripción y confirma a todos los integrantes.</p></div>
          <div><span>03</span><strong>Confirma asistencia</strong><p>Los participantes deben presentarse en Discord antes de la hora indicada.</p></div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
