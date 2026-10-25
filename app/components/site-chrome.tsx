"use client";

import { useCallback, useEffect, useState } from "react";
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

type SessionUser = {
  name: string;
  discord_id: string;
  discord_username: string;
  discord_avatar: string | null;
  minecraft_uuid: string | null;
  minecraft_username: string | null;
  roles?: string[];
  permissions?: string[];
};

type TournamentInvitation = {
  id: number;
  team_name: string;
  team_tag: string | null;
  event: { slug: string; title: string };
  captain: { name: string };
};

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
  const [accountOpen, setAccountOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [invitations, setInvitations] = useState<TournamentInvitation[]>([]);
  const [respondingInvitation, setRespondingInvitation] = useState<number | null>(null);
  const [invitationFeedback, setInvitationFeedback] = useState("");

  const refreshInvitations = useCallback(async () => {
    const response = await fetch("/api/tournament-invitations", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (response.ok) setInvitations((await response.json()).data ?? []);
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("keke-theme");
    const nextTheme = savedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;

    fetch("/auth/me", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((response) => response.ok ? response.json() : null)
      .then(async (payload) => {
        const sessionUser = payload?.data ?? null;
        setUser(sessionUser);
        if (!sessionUser) return;
        await refreshInvitations();
      })
      .catch(() => {
        setUser(null);
        setInvitations([]);
      });
  }, [refreshInvitations]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("keke-theme", nextTheme);
  }

  async function logout() {
    const csrfResponse = await fetch("/auth/csrf", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!csrfResponse.ok) return;

    const { token } = await csrfResponse.json();
    const response = await fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "X-CSRF-TOKEN": token },
    });

    if (response.ok) {
      setUser(null);
      setInvitations([]);
      setAccountOpen(false);
    }
  }

  async function respondToInvitation(invitation: TournamentInvitation, action: "accept" | "reject") {
    setRespondingInvitation(invitation.id);
    setInvitationFeedback("");
    try {
      const csrfResponse = await fetch("/auth/csrf", { credentials: "include", headers: { Accept: "application/json" } });
      if (!csrfResponse.ok) throw new Error("La sesión expiró. Vuelve a iniciar sesión.");
      const { token } = await csrfResponse.json();
      const response = await fetch(`/api/tournament-invitations/${invitation.id}/respond`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-TOKEN": token },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errors = payload.errors && typeof payload.errors === "object"
          ? Object.values(payload.errors as Record<string, string[]>).flat().join(" ")
          : "";
        throw new Error(errors || payload.message || "No se pudo responder la invitación.");
      }
      setInvitations((current) => action === "accept"
        ? current.filter((item) => item.event.slug !== invitation.event.slug)
        : current.filter((item) => item.id !== invitation.id));
      setInvitationFeedback(payload.message ?? "Invitación respondida.");
    } catch (reason) {
      setInvitationFeedback(reason instanceof Error ? reason.message : "No se pudo responder la invitación.");
    } finally {
      setRespondingInvitation(null);
    }
  }

  const avatarUrl = user?.minecraft_uuid
    ? `https://mc-heads.net/avatar/${user.minecraft_uuid}/40.png`
    : user?.discord_avatar
      ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png?size=64`
      : null;
  const accountName = user?.minecraft_username ?? user?.name;

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
            TEMPORADA 01
          </a>

          <div className="utility-actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {user ? (
              <div className="account-menu">
                <button className="login-button is-authenticated" type="button" onClick={() => { const nextOpen = !accountOpen; setAccountOpen(nextOpen); if (nextOpen) void refreshInvitations(); }} aria-expanded={accountOpen} aria-haspopup="menu" aria-label={`Menú de cuenta de ${accountName}`} title="Abrir menú de cuenta">
                  {avatarUrl ? <img src={avatarUrl} alt="" aria-hidden="true" /> : <FaUser aria-hidden="true" />}
                  <span>{accountName}</span>{invitations.length > 0 && <b className="account-invitation-badge" aria-label={`${invitations.length} invitaciones pendientes`}>{invitations.length}</b>}<i className="account-chevron" aria-hidden="true" />
                </button>
                {accountOpen && <div className="account-dropdown" role="menu">
                  {user.roles?.[0] && <small className="account-role">{user.roles[0].toUpperCase()}</small>}
                  {invitations.length > 0 && <section className="account-invitations" aria-label="Invitaciones a equipos">
                    <header><strong>INVITACIONES</strong><span>{invitations.length} PENDIENTE{invitations.length === 1 ? "" : "S"}</span></header>
                    {invitations.map((invitation) => <article key={invitation.id}>
                      <a href={`/eventos/${encodeURIComponent(invitation.event.slug)}`} onClick={() => setAccountOpen(false)}>{invitation.event.title}</a>
                      <strong>{invitation.team_tag ? `[${invitation.team_tag}] ` : ""}{invitation.team_name}</strong>
                      <small>Invita {invitation.captain.name}</small>
                      <div><button type="button" disabled={respondingInvitation === invitation.id} onClick={() => void respondToInvitation(invitation, "accept")}>ACEPTAR</button><button type="button" disabled={respondingInvitation === invitation.id} onClick={() => void respondToInvitation(invitation, "reject")}>RECHAZAR</button></div>
                    </article>)}
                  </section>}
                  {invitationFeedback && <p className="account-invitation-feedback" role="status">{invitationFeedback}</p>}
                  <a href={user.minecraft_uuid ? `/players/${user.minecraft_uuid}` : "/"} role="menuitem" onClick={() => setAccountOpen(false)}>PERFIL</a>
                  <button type="button" role="menuitem" onClick={() => void logout()}>CERRAR SESIÓN</button>
                  {(user.permissions ?? []).some((permission) => ["events.manage", "content.manage"].includes(permission)) && <a href="/staff/contenido" role="menuitem" onClick={() => setAccountOpen(false)}>PANEL DE CONTENIDO</a>}
                  {(user.permissions ?? []).includes("staff.manage") && <a href="/staff/roles" role="menuitem" onClick={() => setAccountOpen(false)}>PANEL DE STAFF</a>}
                </div>}
              </div>
            ) : (
              <a className="login-button" href="/auth/discord" aria-label="Iniciar sesión con Discord">
                <FaDiscord aria-hidden="true" />
                <span>ACCESO</span>
              </a>
            )}
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
