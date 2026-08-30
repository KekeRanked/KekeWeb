"use client";

import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

type StaffMember = {
  minecraft_uuid: string;
  minecraft_username: string;
  is_verified: boolean;
  role: string;
  role_name: string;
  is_sponsor: boolean;
  display_order: number;
};
const roleInfo: Record<
  string,
  { code: string; name: string; label: string; description: string }
> = {
  manager: {
    code: "MGR",
    name: "MANAGERS",
    label: "Manager",
    description:
      "Coordinan la operación diaria de la network, organizan al equipo y convierten las decisiones generales en acciones concretas.",
  },
  admin: {
    code: "ADM",
    name: "ADMINISTRACIÓN",
    label: "Administrador",
    description:
      "Supervisan el servidor, atienden situaciones importantes y garantizan que el reglamento y las decisiones del equipo se apliquen correctamente.",
  },
  moderator: {
    code: "MOD",
    name: "MODERACIÓN",
    label: "Moderador",
    description:
      "Cuidan la convivencia, atienden reportes y aplican el reglamento para mantener partidas justas y ordenadas.",
  },
  screensharer: {
    code: "SSR",
    name: "SCREENSHARE",
    label: "Screensharer",
    description:
      "Realiza revisiones técnicas cuando corresponde y ayuda a proteger la integridad competitiva ante posibles ventajas no permitidas.",
  },
  builder: {
    code: "BLD",
    name: "BUILDERS",
    label: "Builder",
    description:
      "Construyen y mantienen los mapas y espacios donde se desarrolla la experiencia de juego de KEKE.",
  },
  stream_team: {
    code: "STM",
    name: "STREAM TEAM",
    label: "Stream Team",
    description:
      "Representa a KEKE en transmisiones y acerca las partidas, eventos y novedades de la comunidad a los espectadores.",
  },
};
const roleOrder = [
  "manager",
  "admin",
  "moderator",
  "screensharer",
  "builder",
  "stream_team",
];
function head(uuid: string, size: number) {
  return `https://mc-heads.net/avatar/${uuid}/${size}.png`;
}
function MemberCard({ member }: { member: StaffMember }) {
  const info = roleInfo[member.role];
  return (
    <article className="staff-member-card">
      <img
        src={head(member.minecraft_uuid, 72)}
        alt={`Cabeza de Minecraft de ${member.minecraft_username}`}
      />
      <div>
        <strong>{member.minecraft_username}</strong>
        <span>{info?.label ?? member.role_name}</span>
      </div>
      {member.is_sponsor && <small>SPONSOR</small>}
    </article>
  );
}

export default function StaffPage() {
  const [members, setMembers] = useState<StaffMember[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/staff", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar el equipo.");
        return response.json();
      })
      .then((payload) => {
        setMembers(payload.data ?? []);
        setError("");
      })
      .catch((reason) => {
        if (reason?.name !== "AbortError")
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo cargar el equipo.",
          );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  const owner = members.find((member) => member.role === "owner"),
    sponsors = members.filter((member) => member.role === "sponsor");
  const departmentRoles = Array.from(
    new Set(
      members
        .filter((member) => !["owner", "sponsor"].includes(member.role))
        .map((member) => member.role),
    ),
  ).sort((a, b) => {
    const aIndex = roleOrder.indexOf(a),
      bIndex = roleOrder.indexOf(b);
    return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex);
  });
  const departments = departmentRoles.map((role) => {
    const listed = members.filter((member) => member.role === role),
      known = roleInfo[role];
    const roleName = listed[0]?.role_name ?? role.replaceAll("_", " ");
    return {
      role,
      code: known?.code ?? role.slice(0, 3).toUpperCase(),
      name: known?.name ?? roleName.toUpperCase(),
      description:
        known?.description ?? `Miembros del equipo con el cargo ${roleName}.`,
      members: listed,
    };
  });
  return (
    <main>
      <SiteHeader active="staff" />
      <section className="portal-hero staff-public-hero">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div>
          <p className="eyebrow">
            <span>EQUIPO OFICIAL</span> PERSONAS DETRÁS DE KEKE
          </p>
          <h1>
            EL STAFF.
            <br />
            <em>CON NOMBRE PROPIO.</em>
          </h1>
        </div>
        <p>
          Conoce a quienes dirigen, administran y representan la network, además
          de quienes ayudan a mantenerla activa.
        </p>
      </section>

      <section className="public-staff-section">
        <div className="staff-lead">
          {owner ? (
            <img
              className="staff-lead-avatar"
              src={head(owner.minecraft_uuid, 128)}
              alt={`Cabeza de Minecraft de ${owner.minecraft_username}`}
            />
          ) : (
            <div
              className="staff-lead-avatar staff-avatar-loading"
              aria-hidden="true"
            />
          )}
          <div>
            <small>OWNER · DIRECCIÓN DE LA NETWORK</small>
            <h2>
              {owner?.minecraft_username ??
                (loading ? "CARGANDO…" : "DIRECCIÓN")}
            </h2>
            <p>
              Responsable de la visión de KEKE, la infraestructura, la
              coordinación general del equipo y las decisiones que definen el
              futuro del servidor.
            </p>
          </div>
          <a href="/staff/contenido">PANEL DE CONTENIDO</a>
        </div>

        {error && (
          <div className="staff-load-state" role="alert">
            {error}
          </div>
        )}

        <div className="department-grid">
          {departments.map((department, index) => (
            <section className="department-card" key={department.code}>
              <div className="department-head">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{department.code}</strong>
              </div>
              <h3>{department.name}</h3>
              <p>{department.description}</p>
              <div className="staff-member-grid">
                {department.members.map((member) => (
                  <MemberCard member={member} key={member.minecraft_uuid} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="sponsor-section">
          <header>
            <div>
              <small>APOYO MENSUAL</small>
              <h2>SPONSORS</h2>
            </div>
            <p>
              Personas que contribuyen mensualmente a mantener en funcionamiento
              el servidor, su infraestructura y sus servicios. Esta distinción
              reconoce su apoyo y no representa autoridad dentro del staff.
            </p>
          </header>
          <div className="sponsor-grid">
            {sponsors.map((member) => (
              <article className="sponsor-card" key={member.minecraft_uuid}>
                <img
                  src={head(member.minecraft_uuid, 64)}
                  alt={`Cabeza de Minecraft de ${member.minecraft_username}`}
                />
                <div>
                  <strong>{member.minecraft_username}</strong>
                  <span>SPONSOR</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="staff-apply">
          <div>
            <small>POSTULACIONES</small>
            <h2>¿QUIERES FORMAR PARTE?</h2>
            <p>
              Las convocatorias se anuncian únicamente en NEWS. Nunca
              solicitamos pagos para entrar al equipo.
            </p>
          </div>
          <a href="/news">VER CONVOCATORIAS</a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
