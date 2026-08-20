import { SiteFooter, SiteHeader } from "../components/site-chrome";

const minecraftRules = [
  ["01", "Juego limpio", "No se permiten clientes modificados, macros, autoclickers, ventajas visuales ni cualquier herramienta que altere la competencia."],
  ["02", "Respeto durante las partidas", "Los insultos dirigidos, amenazas, acoso y provocaciones reiteradas pueden resultar en sanciones de chat o suspensión."],
  ["03", "Integridad competitiva", "Está prohibido manipular resultados, compartir cuentas, aprovechar errores o abandonar partidas para beneficiar a otro jugador."],
  ["04", "Identidad y cuentas", "Cada jugador es responsable de su cuenta. La evasión de sanciones mediante cuentas alternativas agrava la penalización."],
  ["05", "Reportes y evidencia", "Los reportes deben incluir evidencia clara y presentarse mediante los canales oficiales. Los reportes falsos pueden ser sancionados."],
];

const discordRules = [
  ["01", "Convivencia", "Mantén un trato respetuoso. No se permite discriminación, hostigamiento, amenazas ni ataques personales."],
  ["02", "Contenido apropiado", "No publiques contenido explícito, ilegal, engañoso o diseñado para incomodar a otros miembros."],
  ["03", "Canales y menciones", "Utiliza cada canal para su propósito. Evita el spam, las menciones masivas y la publicidad sin autorización."],
  ["04", "Privacidad", "No compartas información privada propia o ajena. La suplantación de identidad resulta en expulsión inmediata."],
  ["05", "Decisiones del staff", "Si no estás de acuerdo con una sanción, utiliza el sistema de apelaciones. No interrumpas otros canales para discutirla."],
];

function RuleGroup({ id, label, title, rules }: { id: string; label: string; title: string; rules: string[][] }) {
  return (
    <section className="rule-group" id={id}>
      <div className="rule-group-heading"><span>{label}</span><h2>{title}</h2><small>{rules.length} REGLAS PRINCIPALES</small></div>
      <div className="rule-list">
        {rules.map(([number, name, detail]) => (
          <article className="rule-item" key={number}>
            <span>{number}</span><div><h3>{name}</h3><p>{detail}</p></div>
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
          <p className="eyebrow"><span>VERSIÓN 2.4</span> ACTUALIZADO EL 09 AGO 2026</p>
          <h1>REGLAS CLARAS.<br /><em>PARTIDAS JUSTAS.</em></h1>
        </div>
        <p>Al participar en KEKE aceptas estas normas. Desconocerlas no elimina la responsabilidad sobre tus acciones.</p>
      </section>

      <div className="rules-layout">
        <aside className="rules-nav">
          <small>SECCIONES</small>
          <a href="#minecraft"><span>01</span> Minecraft</a>
          <a href="#discord"><span>02</span> Discord</a>
          <div><strong>¿Necesitas ayuda?</strong><p>Abre un ticket si una regla no queda clara o quieres apelar una sanción.</p><button type="button">IR A SOPORTE</button></div>
        </aside>
        <div>
          <RuleGroup id="minecraft" label="EN EL SERVIDOR" title="REGLAS DE MINECRAFT" rules={minecraftRules} />
          <RuleGroup id="discord" label="EN LA COMUNIDAD" title="REGLAS DE DISCORD" rules={discordRules} />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
