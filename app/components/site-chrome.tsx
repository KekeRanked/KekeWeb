"use client";

import { useEffect, useState } from "react";
import { FaDiscord, FaGithub, FaTwitch, FaUser, FaXTwitter, FaYoutube } from "react-icons/fa6";

type Section = "inicio" | "play" | "rankeds" | "leaderboards" | "news" | "reglas" | "eventos" | "staff" | "tienda";

const navigation = [
  { key: "inicio", label: "INICIO", href: "/" },
  { key: "play", label: "PLAY", href: "/play" },
  { key: "rankeds", label: "RANKEDS", href: "/rankeds" },
  { key: "leaderboards", label: "LEADERBOARDS", href: "/leaderboards" },
  { key: "news", label: "NEWS", href: "/news" },
  { key: "reglas", label: "REGLAS", href: "/reglas" },
  { key: "eventos", label: "EVENTOS", href: "/eventos" },
  { key: "staff", label: "STAFF", href: "/staff" },
] as const;

const socialLinks = [
  { label: "X", icon: FaXTwitter },
  { label: "Discord", icon: FaDiscord },
  { label: "Twitch", icon: FaTwitch },
  { label: "YouTube", icon: FaYoutube },
  { label: "GitHub", icon: FaGithub },
] as const;

function ThemeToggle({ theme, onToggle }: { theme: "dark" | "light"; onToggle: () => void }) {
  return (
    <button className="theme-toggle" type="button" onClick={onToggle} aria-label={`Cambiar a modo ${theme === "dark" ? "claro" : "oscuro"}`}>
      <span className="theme-toggle-track" aria-hidden="true"><i /></span>
      <span className="theme-toggle-label">{theme === "dark" ? "MODO CLARO" : "MODO OSCURO"}</span>
    </button>
  );
}

export function SiteHeader({ active }: { active: Section }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("keke-theme");
    const nextTheme = savedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("keke-theme", nextTheme);
  }

  return (
    <>
      <div className="utility-bar">
        <div className="utility-inner">
          <nav className="social-links" aria-label="Redes sociales">
            {socialLinks.map((social) => {
              const SocialIcon = social.icon;
              return <a href="#" aria-label={social.label} title={social.label} key={social.label}><SocialIcon aria-hidden="true" /></a>;
            })}
          </nav>

          <a className="utility-news" href="/news">
            <span className="utility-live" aria-hidden="true" />
            BETA ACTIVA
          </a>

          <div className="utility-actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button className="login-button" type="button" aria-label="Iniciar sesión">
              <FaUser aria-hidden="true" />
              <span>ACCESO</span>
            </button>
          </div>
        </div>
      </div>

      <header className="site-header">
        <a className="brand" href="/" aria-label="Keke, inicio">
          <img className="brand-logo" src="/server-logo.png" alt="" aria-hidden="true" />
          <span className="brand-copy">
            <strong>KEKE</strong>
            <small>RANKED NETWORK</small>
          </span>
        </a>

        <button
          className="menu-button"
          type="button"
          aria-label="Abrir navegación"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span />
          <span />
        </button>

        <nav className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Navegación principal">
          {navigation.map((item) => (
            <a
              className={active === item.key ? "is-active" : undefined}
              href={item.href}
              key={item.key}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a className={active === "tienda" ? "store-nav is-active" : "store-nav"} href="/tienda" onClick={() => setMenuOpen(false)}>TIENDA</a>
        </nav>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <a className="brand footer-brand" href="/">
        <img className="brand-logo" src="/server-logo.png" alt="" aria-hidden="true" />
        <span className="brand-copy"><strong>KEKE</strong><small>RANKED NETWORK</small></span>
      </a>
      <p>Servidor competitivo de Minecraft creado por y para jugadores.</p>
      <div className="footer-links">
        <a href="/news">NEWS</a>
        <a href="/play">Play</a>
        <a href="/rankeds">Rankeds</a>
        <a href="/leaderboards">Leaderboards</a>
        <a href="/reglas">Reglas</a>
        <a href="/eventos">Eventos</a>
        <a href="/staff">Staff</a>
        <a href="/tienda">Tienda</a>
      </div>
      <small>© 2026 KEKE NETWORK. NO AFILIADO A MOJANG STUDIOS.</small>
    </footer>
  );
}
