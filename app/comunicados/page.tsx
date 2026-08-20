import { SiteFooter, SiteHeader } from "../components/site-chrome";

const notices = [
  {
    category: "COMPETITIVO",
    date: "LANZAMIENTO",
    title: "Comienza la Temporada Beta con un nuevo sistema de divisiones",
    summary: "Iniciamos la clasificación con 9 rangos, desde Iron hasta Radiant. Compite, escala y demuestra tu nivel.",
  },
  {
    category: "MANTENIMIENTO",
    date: "08 AGO 2026",
    title: "Mantenimiento programado de la red",
    summary: "El servidor permanecerá fuera de línea durante aproximadamente 45 minutos mientras aplicamos mejoras de estabilidad.",
  },
  {
    category: "COMUNIDAD",
    date: "03 AGO 2026",
    title: "Abrimos postulaciones para moderación",
    summary: "Buscamos personas responsables, activas y con experiencia en resolución de conflictos dentro de comunidades competitivas.",
  },
  {
    category: "BALANCE",
    date: "29 JUL 2026",
    title: "Ajustes al kit NoDebuff y rotación de mapas",
    summary: "Actualizamos tiempos de reutilización y retiramos temporalmente dos mapas para corregir posiciones de aparición.",
  },
];

export default function ComunicadosPage() {
  const [featured, ...recent] = notices;

  return (
    <main>
      <SiteHeader active="news" />
      <section className="portal-hero">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div>
          <p className="eyebrow"><span>ARCHIVO OFICIAL</span> NEWS DEL SERVIDOR</p>
          <h1>SERVER NEWS.<br /><em>SIN RUMORES.</em></h1>
        </div>
        <p>Actualizaciones importantes, mantenimientos y decisiones del equipo en un registro público y ordenado.</p>
      </section>

      <section className="notice-section">
        <div className="notice-toolbar">
          <strong>ÚLTIMAS PUBLICACIONES</strong>
          <div className="filter-list" aria-label="Categorías disponibles">
            <span className="is-selected">TODAS</span><span>COMPETITIVO</span><span>MANTENIMIENTO</span><span>COMUNIDAD</span>
          </div>
        </div>

        <article className="featured-notice">
          <div className="notice-visual" aria-hidden="true"><span>S04</span><b>11</b></div>
          <div className="notice-body">
            <div className="content-meta"><span>{featured.category}</span><time>{featured.date}</time></div>
            <h2>{featured.title}</h2>
            <p>{featured.summary}</p>
            <button type="button">LEER NEWS COMPLETA</button>
          </div>
        </article>

        <div className="notice-list">
          {recent.map((notice, index) => (
            <article className="notice-row" key={notice.title}>
              <span className="notice-number">{String(index + 2).padStart(2, "0")}</span>
              <div className="content-meta"><span>{notice.category}</span><time>{notice.date}</time></div>
              <div><h3>{notice.title}</h3><p>{notice.summary}</p></div>
              <button type="button">LEER</button>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
