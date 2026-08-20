import { SiteFooter, SiteHeader } from "../components/site-chrome";

const ranks = [
  { tier: "01", name: "VIP", price: "4.99", description: "La forma directa de apoyar al servidor.", perks: ["Prefijo VIP", "2 cosméticos exclusivos", "Cola prioritaria", "Kit visual de lobby"] },
  { tier: "02", name: "ELITE", price: "9.99", description: "Más identidad y personalización dentro de la red.", perks: ["Todo lo incluido en VIP", "Prefijo y color personalizable", "5 cosméticos exclusivos", "Acceso anticipado a mapas"], featured: true },
  { tier: "03", name: "CHAMPION", price: "14.99", description: "El rango más completo para quienes sostienen KEKE.", perks: ["Todo lo incluido en ELITE", "Efectos de victoria", "Sala social exclusiva", "Perfil web destacado"] },
];

export default function TiendaPage() {
  return (
    <main>
      <SiteHeader active="tienda" />
      <section className="portal-hero store-hero">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div>
          <p className="eyebrow"><span>TIENDA OFICIAL</span> RANGOS Y COSMÉTICOS</p>
          <h1>APOYA LA RED.<br /><em>DESTACA A TU MANERA.</em></h1>
        </div>
        <p>Todos los rangos ofrecen beneficios visuales y sociales. Ninguna compra aumenta tu MMR ni altera una partida competitiva.</p>
      </section>

      <section className="store-section">
        <div className="store-notice"><strong>COMPETENCIA LIMPIA</strong><span>Los rangos no incluyen ventajas de combate, estadísticas adicionales ni prioridad en el sistema de matchmaking.</span></div>
        <div className="rank-store-grid">
          {ranks.map((rank) => (
            <article className={rank.featured ? "rank-product is-featured" : "rank-product"} key={rank.name}>
              <div className="product-top"><span>{rank.tier}</span>{rank.featured && <small>MÁS ELEGIDO</small>}</div>
              <div className="product-emblem"><strong>{rank.name.slice(0, 1)}</strong></div>
              <h2>{rank.name}</h2>
              <p>{rank.description}</p>
              <div className="product-price"><span>USD</span><strong>${rank.price}</strong><small>PAGO ÚNICO</small></div>
              <ul>{rank.perks.map((perk) => <li key={perk}>{perk}</li>)}</ul>
              <button type="button">SELECCIONAR RANGO</button>
            </article>
          ))}
        </div>
        <div className="purchase-steps">
          <div><span>01</span><strong>Elige tu rango</strong><p>Compara los beneficios y selecciona el que prefieras.</p></div>
          <div><span>02</span><strong>Confirma tu cuenta</strong><p>Ingresa con Discord y vincula tu usuario de Minecraft.</p></div>
          <div><span>03</span><strong>Recibe tu compra</strong><p>El rango se entrega automáticamente después del pago.</p></div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
