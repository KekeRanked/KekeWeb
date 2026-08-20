import { SiteFooter, SiteHeader } from "../components/site-chrome";

const steps = [
  { number: "01", title: "PREPARA TU CUENTA", description: "Entra con tu cuenta de Minecraft y vincula Discord para que tu perfil, historial y sanciones estén asociados correctamente." },
  { number: "02", title: "ELIGE UNA MODALIDAD", description: "Desde el lobby competitivo selecciona el formato disponible en el que quieras buscar partida." },
  { number: "03", title: "ENTRA AL MATCHMAKING", description: "El sistema busca jugadores con un nivel competitivo cercano y prepara automáticamente la arena." },
  { number: "04", title: "JUEGA Y PROGRESA", description: "Al terminar, el resultado queda guardado y tu MMR se actualiza según el desempeño de ambos lados." },
];

const modes = [
  { code: "SOLO", size: "1V1", title: "DUELO INDIVIDUAL", description: "Una prueba directa de mecánicas, adaptación y consistencia. Tu resultado depende únicamente de ti." },
  { code: "DUO", size: "2V2", title: "PARTIDA EN PAREJA", description: "Coordinación rápida, presión compartida y decisiones en conjunto con un compañero." },
  { code: "SQUAD", size: "4V4", title: "EQUIPO COMPLETO", description: "Estrategia, comunicación y control de la partida entre cuatro integrantes por lado." },
];

const divisions = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "ASCENDANT", "IMMORTAL", "RADIANT"];

export default function RankedsPage() {
  return (
    <main>
      <SiteHeader active="rankeds" />

      <section className="portal-hero rankeds-hero">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div>
          <p className="eyebrow"><span>MODO COMPETITIVO</span> GUÍA DE RANKEDS</p>
          <h1>ENTRA A LA COLA.<br /><em>DEMUESTRA TU NIVEL.</em></h1>
        </div>
        <p>Todo lo que necesitas saber antes de disputar una partida clasificatoria en KEKE Network.</p>
      </section>

      <section className="rankeds-section">
        <div className="rankeds-facts" aria-label="Información general de las rankeds">
          <div><small>VERSIÓN</small><strong>JAVA 1.21+</strong><span>Acceso desde el lobby</span></div>
          <div><small>FORMATOS</small><strong>1V1 · 2V2 · 4V4</strong><span>Según disponibilidad</span></div>
          <div><small>PROGRESIÓN</small><strong>MMR DINÁMICO</strong><span>Cada resultado cuenta</span></div>
          <div><small>REGISTRO</small><strong>HISTORIAL WEB</strong><span>Partidas y estadísticas</span></div>
        </div>

        <div className="rankeds-heading">
          <div><p className="eyebrow"><span>PRIMERA PARTIDA</span> PASO A PASO</p><h2>¿CÓMO SE JUEGA?</h2></div>
          <p>El proceso está diseñado para llevarte del lobby a una partida equilibrada sin configuraciones complicadas.</p>
        </div>

        <div className="ranked-steps">
          {steps.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>
              <div><h3>{step.title}</h3><p>{step.description}</p></div>
            </article>
          ))}
        </div>

        <div className="ranked-modes-heading">
          <div><p className="eyebrow"><span>FORMATOS</span> ELIGE TU MANERA DE COMPETIR</p><h2>MODALIDADES RANKED</h2></div>
        </div>
        <div className="ranked-modes">
          {modes.map((mode, index) => (
            <article className={index === 1 ? "ranked-mode is-featured" : "ranked-mode"} key={mode.code}>
              <div className="mode-top"><span>{mode.code}</span><strong>{mode.size}</strong></div>
              <div className="mode-mark" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
              <h3>{mode.title}</h3>
              <p>{mode.description}</p>
              <small>DISPONIBLE DURANTE LA TEMPORADA</small>
            </article>
          ))}
        </div>

        <section className="mmr-explainer">
          <div className="mmr-copy">
            <p className="eyebrow"><span>PROGRESIÓN</span> TU NIVEL COMPETITIVO</p>
            <h2>EL MMR DEFINE<br />TU POSICIÓN.</h2>
            <p>Las victorias aumentan tu puntuación y las derrotas pueden reducirla. El ajuste considera la diferencia de nivel entre los participantes para evitar que todas las partidas valgan lo mismo.</p>
            <div className="mmr-notes">
              <span>Tu rango se actualiza después de cada resultado.</span>
              <span>Las partidas quedan visibles en tu historial web.</span>
              <span>Abandonar o manipular resultados puede generar sanciones.</span>
            </div>
          </div>
          <div className="division-ladder" aria-label="Ejemplos de divisiones competitivas">
            <div className="ladder-head"><small>ESCALERA COMPETITIVA</small><span>MENOR MMR</span><span>MAYOR MMR</span></div>
            {divisions.map((division, index) => (
              <div className={division === "DIAMOND" ? "division-row is-current" : "division-row"} key={division}>
                <span>{String(index + 1).padStart(2, "0")}</span><strong>{division}</strong>{division === "DIAMOND" && <small>RANGO DE EJEMPLO</small>}
              </div>
            ))}
          </div>
        </section>

        <div className="ranked-rules-cta">
          <div><small>ANTES DE BUSCAR PARTIDA</small><h2>COMPITE LIMPIO.</h2><p>El uso de ventajas externas, la manipulación de resultados y el abandono intencional afectan la experiencia competitiva.</p></div>
          <a href="/reglas">LEER REGLAMENTO COMPETITIVO</a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
