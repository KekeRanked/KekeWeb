import { SiteFooter, SiteHeader } from "../components/site-chrome";

type Rule = {
  number: string;
  name: string;
  detail: string;
  points?: string[];
};

const minecraftRules: Rule[] = [
  { number: "01", name: "Integridad competitiva", detail: "Está prohibida cualquier manipulación de ELO, incluyendo perder a propósito, hacer boosting con cuentas alternas o acordar resultados." },
  { number: "02", name: "Uso de cuentas", detail: "Solo se permite una cuenta por jugador. Usar cuentas secundarias para evadir sanciones o alterar el ranking resultará en sanciones permanentes para la secundaria y pérdida de ELO para la principal." },
  { number: "03", name: "Abandono de partidas", detail: "Es obligatorio permanecer en la partida hasta el final. Abandonar, estar AFK o desconectarse durante periodos críticos, como el balanceo o los picks, será sancionado con doble derrota y suspensión temporal de la Queue." },
  { number: "04", name: "Uso de voz", detail: "El uso de micrófono es obligatorio en todas las modalidades. Está prohibido ensordecerse (deafen). Debes estar activo tanto en el juego como en el canal de voz del servidor." },
  { number: "05", name: "Multitasking", detail: "No está permitido permanecer en servidores de Discord de otras comunidades mientras juegas nuestras rankeds." },
  { number: "06", name: "Juego limpio", detail: "Está prohibido usar bugs, practicar block glitching o revelar información táctica (Tactical Info)." },
  {
    number: "07",
    name: "Hardware y software",
    detail: "Las herramientas, modificaciones y ajustes que puedan alterar la competencia están sujetos a estas condiciones:",
    points: [
      "Se prohíben las macros (autoclick), el double clicking y un debounce timer menor a 10 ms. El límite máximo es de 20 CPS.",
      "Se prohíbe cualquier mod o herramienta externa que otorgue una ventaja injusta, como damage indicator, minimapa con entidades o tracers.",
      "Cualquier mod adicional debe ser consultado y aprobado previamente por el Staff.",
    ],
  },
  { number: "08", name: "Comportamiento", detail: "Se prohíbe el abuso de lenguaje, los insultos tóxicos y el acoso a otros jugadores durante la partida." },
];

const discordRules: Rule[] = [
  { number: "01", name: "Respeto", detail: "Mantén un ambiente deportivo. Se prohíben el acoso, las amenazas, el doxxing y la discriminación de cualquier tipo." },
  { number: "02", name: "Orden", detail: "No hagas spam ni publiques contenido malicioso o enlaces acortados." },
  { number: "03", name: "Publicidad", detail: "Está prohibida la publicidad de otros servidores o servicios sin autorización." },
  { number: "04", name: "Staff", detail: "Sigue las instrucciones de los moderadores. Si consideras que una sanción es injusta, utiliza los canales oficiales de apelación." },
  { number: "05", name: "Canales", detail: "Mantén las discusiones en los canales correspondientes. Utiliza #comandos para ejecutar comandos de bots o interactuar con funciones automáticas." },
];

const sanctions = [
  ["Toxicidad / Insultos (Chat)", "Advertencia (Warn)", "Mute 30 min", "Mute 1 hora"],
  ["Abandono / AFK (Ranked)", "Doble derrota", "Expulsión Queue (24h)", "Expulsión Queue (7d)"],
  ["Uso de Bugs / Glitches", "Advertencia (Warn) / Kick de la partida", "Expulsión Queue (1h)", "Expulsión Queue (12h)"],
  ["Uso de Hacks / Mods ilegales", "Ban permanente", "N/A", "N/A"],
  ["Incumplimiento de Voz/Mic", "Aviso / Kick del canal", "Expulsión Queue (1h)", "Expulsión Queue (6h)"],
  ["Uso de Cuentas Alt", "Ban cuenta secundaria", "Ban permanente (ambas)", "N/A"],
];

function RuleGroup({ id, label, title, intro, rules }: { id: string; label: string; title: string; intro: string; rules: Rule[] }) {
  return (
    <section className="rule-group" id={id}>
      <div className="rule-group-heading">
        <span>{label}</span><h2>{title}</h2><small>{rules.length} REGLAS</small>
      </div>
      <p className="rule-group-intro">{intro}</p>
      <div className="rule-list">
        {rules.map((rule) => (
          <article className="rule-item" key={rule.number}>
            <span>{rule.number}</span>
            <div>
              <h3>{rule.name}</h3><p>{rule.detail}</p>
              {rule.points && <ul>{rule.points.map((point) => <li key={point}>{point}</li>)}</ul>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ReglasPage() {
  return (
    <main>
      <SiteHeader active="reglas" />
      <section className="portal-hero rules-hero">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div>
          <p className="eyebrow"><span>REGLAMENTO OFICIAL</span> TEMPORADA 0</p>
          <h1>REGLAS CLARAS.<br /><em>PARTIDAS JUSTAS.</em></h1>
        </div>
        <p>Estas normas rigen las partidas ranked y la convivencia en Discord. Participar en KEKE implica conocerlas y respetarlas.</p>
      </section>

      <div className="rules-layout">
        <aside className="rules-nav">
          <small>SECCIONES</small>
          <a href="#minecraft"><span>01</span> In-Game</a>
          <a href="#discord"><span>02</span> Discord</a>
          <a href="#sanciones"><span>03</span> Sanciones</a>
          <a href="#disposicion"><span>04</span> Disposición final</a>
          <div><strong>¿Necesitas ayuda?</strong><p>Abre un ticket si una regla no queda clara o quieres apelar una sanción.</p><button type="button">IR A SOPORTE</button></div>
        </aside>

        <div>
          <RuleGroup id="minecraft" label="PARTIDAS RANKED" title="REGLAS IN-GAME" intro="Estas reglas rigen el comportamiento técnico y deportivo dentro de las partidas de Minecraft." rules={minecraftRules} />
          <RuleGroup id="discord" label="FUERA DEL JUEGO" title="REGLAS DE DISCORD" intro="Estas reglas rigen la convivencia social fuera del juego." rules={discordRules} />

          <section className="rule-group sanctions-section" id="sanciones">
            <div className="rule-group-heading"><span>SISTEMA ESCALONADO</span><h2>TABLA DE SANCIONES</h2><small>6 INFRACCIONES</small></div>
            <p className="rule-group-intro">Las reincidencias aumentan la duración o gravedad de la sanción según la siguiente tabla.</p>
            <div className="sanctions-table-wrap">
              <table className="sanctions-table">
                <thead><tr><th>Infracción</th><th>1ra vez</th><th>2da vez</th><th>3ra vez</th></tr></thead>
                <tbody>
                  {sanctions.map(([infraction, first, second, third]) => (
                    <tr key={infraction}><th scope="row">{infraction}</th><td>{first}</td><td>{second}</td><td>{third}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="final-ruling" id="disposicion">
            <span>04 / INTERPRETACIÓN DE LAS REGLAS</span>
            <h2>DISPOSICIÓN FINAL</h2>
            <p>Cualquier situación, conducta o circunstancia que no se encuentre expresamente contemplada en este reglamento quedará sujeta a la interpretación y criterio del Staff.</p>
            <p>El Staff se reserva el derecho de evaluar y determinar las medidas correspondientes en aquellos casos que, aun sin estar específicamente tipificados, puedan afectar la integridad competitiva o el correcto funcionamiento de la comunidad.</p>
          </section>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
