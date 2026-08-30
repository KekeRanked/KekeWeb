"use client";

import { FormEvent, useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";

type Permission = { key: string; name: string };
type Role = {
  key: string;
  name: string;
  priority?: number;
  permissions?: Permission[];
};
type User = {
  id: number;
  name: string;
  discord_username: string;
  minecraft_username?: string | null;
  minecraft_uuid?: string | null;
  roles: Role[];
};
type VerifiedPlayer = {
  minecraft_uuid: string;
  minecraft_username: string;
  discord_id: string | null;
  user?: User | null;
};
type PublicStaffMember = {
  minecraft_uuid: string;
  minecraft_username: string | null;
  role: string;
  is_sponsor: boolean;
  display_order: number;
  is_active: boolean;
};

export default function StaffRolesPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null),
    [roles, setRoles] = useState<Role[]>([]),
    [permissions, setPermissions] = useState<Permission[]>([]),
    [users, setUsers] = useState<User[]>([]),
    [staffMembers, setStaffMembers] = useState<PublicStaffMember[]>([]),
    [feedback, setFeedback] = useState("");
  const [showAdd, setShowAdd] = useState(false),
    [newName, setNewName] = useState(""),
    [newDiscord, setNewDiscord] = useState(""),
    [newUuid, setNewUuid] = useState(""),
    [newMinecraft, setNewMinecraft] = useState(""),
    [newRole, setNewRole] = useState("sponsor");
  const [search, setSearch] = useState("");
  const [actorPriority, setActorPriority] = useState(0);
  const [actorMinecraftUuid, setActorMinecraftUuid] = useState<string | null>(
    null,
  );
  const permissionsOnly =
    typeof window !== "undefined" &&
    window.location.pathname.endsWith("/permisos");
  const [verifiedPlayers, setVerifiedPlayers] = useState<VerifiedPlayer[]>([]);
  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setVerifiedPlayers([]);
      return;
    }
    const timer = window.setTimeout(() => {
      fetch(
        `/api/admin/roles/verified-players?q=${encodeURIComponent(query)}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      )
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((p) => setVerifiedPlayers(p.data ?? []))
        .catch(() => setVerifiedPlayers([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    fetch("/api/admin/roles", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((r) => {
        if (r.status === 403) {
          setAllowed(false);
          return null;
        }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((p) => {
        if (!p) return;
        setAllowed(true);
        setActorPriority(p.actor_priority ?? 0);
        setActorMinecraftUuid(p.actor_minecraft_uuid ?? null);
        setRoles(p.roles ?? []);
        setPermissions(
          Array.from(
            new Map(
              (p.roles ?? [])
                .flatMap((role: Role) => role.permissions ?? [])
                .map((permission: Permission) => [permission.key, permission]),
            ).values(),
          ),
        );
        setUsers(p.users ?? []);
        setStaffMembers(p.staff_members ?? []);
      })
      .catch(() => setAllowed(false));
  }, []);
  async function save(user: User, key: string) {
    const token = await fetch("/auth/csrf", { credentials: "include" })
      .then((r) => r.json())
      .then((p) => p.token);
    const response = await fetch(`/api/admin/roles/users/${user.id}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": token,
      },
      body: JSON.stringify({ roles: [key] }),
    });
    if (response.ok) {
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, roles: roles.filter((role) => role.key === key) }
            : item,
        ),
      );
      setFeedback("Rol actualizado correctamente.");
      if (user.minecraft_uuid) {
        setStaffMembers((current) =>
          current.map((member) =>
            member.minecraft_uuid === user.minecraft_uuid
              ? { ...member, role: key }
              : member,
          ),
        );
      }
    } else setFeedback("No se pudo actualizar el rol.");
  }
  async function savePublicMember(
    member: PublicStaffMember,
    changes: Partial<PublicStaffMember>,
  ) {
    const next = { ...member, ...changes };
    const token = await fetch("/auth/csrf", { credentials: "include" })
      .then((r) => r.json())
      .then((p) => p.token);
    const response = await fetch(
      `/api/admin/staff-members/${member.minecraft_uuid}`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": token,
        },
        body: JSON.stringify({
          role: next.role,
          is_sponsor: next.is_sponsor,
          display_order: next.display_order,
          is_active: next.is_active,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback(payload.message ?? "No se pudo actualizar el Staff público.");
      return;
    }
    setStaffMembers((current) => {
      const exists = current.some(
        (item) => item.minecraft_uuid === member.minecraft_uuid,
      );
      return exists
        ? current.map((item) =>
            item.minecraft_uuid === member.minecraft_uuid ? payload.data : item,
          )
        : [...current, payload.data];
    });
    setFeedback("La página pública de Staff fue actualizada.");
  }
  async function publishPlayer(player: VerifiedPlayer) {
    const assignedRole = player.user?.roles[0]?.key;
    const role =
      assignedRole &&
      (roles.find((item) => item.key === assignedRole)?.priority ?? 0) <
        actorPriority
        ? assignedRole
        : "sponsor";
    await savePublicMember(
      {
        minecraft_uuid: player.minecraft_uuid,
        minecraft_username: player.minecraft_username,
        role,
        is_sponsor: role === "sponsor",
        display_order:
          Math.max(0, ...staffMembers.map((member) => member.display_order)) +
          10,
        is_active: true,
      },
      {},
    );
  }
  async function removePublicMember(member: PublicStaffMember) {
    if (!window.confirm(`¿Retirar a ${member.minecraft_username} de /staff?`))
      return;
    const token = await fetch("/auth/csrf", { credentials: "include" })
      .then((r) => r.json())
      .then((p) => p.token);
    const response = await fetch(
      `/api/admin/staff-members/${member.minecraft_uuid}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json", "X-CSRF-TOKEN": token },
      },
    );
    if (response.ok) {
      setStaffMembers((current) =>
        current.filter((item) => item.minecraft_uuid !== member.minecraft_uuid),
      );
      setFeedback("Miembro retirado de la página pública.");
    } else setFeedback("No se pudo retirar al miembro de /staff.");
  }
  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    const token = await fetch("/auth/csrf", { credentials: "include" })
      .then((r) => r.json())
      .then((p) => p.token);
    const response = await fetch("/api/admin/roles/users", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": token,
      },
      body: JSON.stringify({
        name: newName,
        discord_id: newDiscord,
        minecraft_uuid: newUuid || null,
        minecraft_username: newMinecraft || null,
        role: newRole,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback(payload.message ?? "No se pudo añadir la cuenta.");
      return;
    }
    setUsers((current) => [...current, payload.data]);
    setNewName("");
    setNewDiscord("");
    setNewUuid("");
    setNewMinecraft("");
    setNewRole("sponsor");
    setShowAdd(false);
    setFeedback("Cuenta añadida y rol asignado correctamente.");
  }
  const visibleUsers = users.filter((user) =>
    [user.name, user.discord_username, user.minecraft_username ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  async function saveRole(role: Role, selected: string[]) {
    const token = await fetch("/auth/csrf", { credentials: "include" })
      .then((r) => r.json())
      .then((p) => p.token);
    const response = await fetch(`/api/admin/roles/definitions/${role.key}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": token,
      },
      body: JSON.stringify({ permissions: selected }),
    });
    if (response.ok) {
      const payload = await response.json();
      setRoles((current) =>
        current.map((item) => (item.key === role.key ? payload.data : item)),
      );
      setFeedback("Permisos del rol actualizados.");
    } else setFeedback("No se pudo actualizar el rol.");
  }
  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selected = permissions
      .filter((permission) =>
        form.getAll("new-permission").includes(permission.key),
      )
      .map((permission) => permission.key);
    const token = await fetch("/auth/csrf", { credentials: "include" })
      .then((r) => r.json())
      .then((p) => p.token);
    const response = await fetch("/api/admin/roles/definitions", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": token,
      },
      body: JSON.stringify({
        key: form.get("key"),
        name: form.get("name"),
        permissions: selected,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setRoles((current) => [...current, payload.data]);
      setFeedback("Rol creado correctamente.");
      event.currentTarget.reset();
    } else setFeedback(payload.message ?? "No se pudo crear el rol.");
  }
  async function deleteRole(role: Role) {
    if (!window.confirm(`¿Eliminar el rol ${role.name}?`)) return;
    const token = await fetch("/auth/csrf", { credentials: "include" })
      .then((r) => r.json())
      .then((p) => p.token);
    const response = await fetch(`/api/admin/roles/definitions/${role.key}`, {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json", "X-CSRF-TOKEN": token },
    });
    if (response.ok) {
      setRoles((current) => current.filter((item) => item.key !== role.key));
      setFeedback("Rol eliminado.");
    } else setFeedback("No se pudo eliminar el rol.");
  }
  return (
    <main>
      <SiteHeader active="staff" />
      <section className="staff-header">
        <div>
          <p className="eyebrow">
            <span>PANEL DE STAFF</span> CONTROL DE ACCESO
          </p>
          <h1>
            {permissionsOnly ? (
              <>
                ROLES STAFF.
                <br />
                <em>PERMISOS.</em>
              </>
            ) : (
              <>
                STAFF.
                <br />
                <em>GESTIÓN DEL EQUIPO.</em>
              </>
            )}
          </h1>
        </div>
        <div className="staff-identity">
          <small>PERMISO</small>
          <strong>STAFF.MANAGE</strong>
          <span>Solo Owner y Admin</span>
        </div>
      </section>
      <section className="staff-workspace">
        <aside className="staff-sidebar">
          <small>CONFIGURACIÓN</small>
          <a href="/staff/contenido">Eventos</a>
          <a
            href="/staff/roles"
            className={!permissionsOnly ? "is-active" : undefined}
          >
            Staff
          </a>
          <a
            href="/staff/permisos"
            className={permissionsOnly ? "is-active" : undefined}
          >
            Roles Staff
          </a>
        </aside>
        <div className="staff-main">
          {allowed === null && (
            <p className="history-empty">VERIFICANDO SESIÓN…</p>
          )}
          {allowed === false && (
            <div className="staff-load-state" role="alert">
              No tienes permiso para administrar los roles del Staff.
            </div>
          )}
          {allowed && (
            <>
              <div className="staff-section-heading">
                <div>
                  <small>
                    {permissionsOnly
                      ? "CONFIGURACIÓN DE ROLES"
                      : "CUENTAS CON ACCESO"}
                  </small>
                  <h2>
                    {permissionsOnly ? "ROLES Y PERMISOS" : "ASIGNAR ROLES"}
                  </h2>
                </div>
                {!permissionsOnly && (
                  <button
                    className="button-primary"
                    type="button"
                    onClick={() => setShowAdd((value) => !value)}
                  >
                    {showAdd ? "CANCELAR" : "AÑADIR USUARIO"}
                  </button>
                )}
              </div>
              {showAdd && (
                <form
                  className="content-form staff-add-form"
                  onSubmit={addUser}
                >
                  <div className="form-row">
                    <label>
                      Nombre
                      <input
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nombre visible"
                      />
                    </label>
                    <label>
                      ID de Discord
                      <input
                        required
                        value={newDiscord}
                        onChange={(e) => setNewDiscord(e.target.value)}
                        placeholder="Ej. 1299214857731702836"
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      UUID de Minecraft
                      <input
                        value={newUuid}
                        onChange={(e) => setNewUuid(e.target.value)}
                        placeholder="Opcional"
                      />
                    </label>
                    <label>
                      Nick de Minecraft
                      <input
                        value={newMinecraft}
                        onChange={(e) => setNewMinecraft(e.target.value)}
                        placeholder="Opcional"
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      Rol
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                      >
                        {roles.map((role) => (
                          <option key={role.key} value={role.key}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="form-actions">
                      <button className="button-primary" type="submit">
                        AÑADIR Y ASIGNAR
                      </button>
                    </div>
                  </div>
                </form>
              )}
              {permissionsOnly && (
                <section className="role-management" id="role-management">
                  {roles.map((role) => (
                    <div className="role-definition" key={role.key}>
                      <div>
                        <strong>{role.name}</strong>
                        <small>{role.key}</small>
                      </div>
                      <div className="permission-list">
                        {permissions.map((permission) => (
                          <label key={permission.key}>
                            <input
                              type="checkbox"
                              checked={
                                role.permissions?.some(
                                  (item) => item.key === permission.key,
                                ) ?? false
                              }
                              disabled={role.key === "owner"}
                              onChange={(event) =>
                                void saveRole(role, [
                                  ...(role.permissions ?? [])
                                    .map((item) => item.key)
                                    .filter((key) => key !== permission.key),
                                  ...(event.target.checked
                                    ? [permission.key]
                                    : []),
                                ])
                              }
                            />
                            {permission.name}
                          </label>
                        ))}
                      </div>
                      {role.key !== "owner" &&
                        (role.priority ?? 0) < actorPriority && (
                          <button
                            className="button-muted"
                            type="button"
                            onClick={() => void deleteRole(role)}
                          >
                            ELIMINAR
                          </button>
                        )}
                    </div>
                  ))}
                  <form
                    className="content-form role-create-form"
                    onSubmit={createRole}
                  >
                    <div className="form-row">
                      <label>
                        Clave
                        <input name="key" required placeholder="builder_plus" />
                      </label>
                      <label>
                        Nombre
                        <input
                          name="name"
                          required
                          placeholder="Builder Plus"
                        />
                      </label>
                    </div>
                    <div className="permission-list">
                      {permissions.map((permission) => (
                        <label key={permission.key}>
                          <input
                            type="checkbox"
                            name="new-permission"
                            value={permission.key}
                          />
                          {permission.name}
                        </label>
                      ))}
                    </div>
                    <button className="button-primary" type="submit">
                      CREAR ROL
                    </button>
                  </form>
                </section>
              )}
              {!permissionsOnly && (
                <section className="public-staff-manager">
                  <div className="staff-section-heading">
                    <div>
                      <small>PÁGINA PÚBLICA</small>
                      <h2>EQUIPO VISIBLE EN /STAFF</h2>
                    </div>
                    <span>
                      Cargo, Sponsor, orden y visibilidad se actualizan aquí
                    </span>
                  </div>
                  <div className="public-staff-table-head" aria-hidden="true">
                    <span>Jugador</span>
                    <span>Cargo visible</span>
                    <span>Sponsor</span>
                    <span>Orden</span>
                    <span>Visible</span>
                    <span />
                  </div>
                  {staffMembers.map((member) => {
                    const currentPriority =
                      roles.find((role) => role.key === member.role)
                        ?.priority ?? 0;
                    const manageable =
                      currentPriority < actorPriority ||
                      actorMinecraftUuid === member.minecraft_uuid;
                    return (
                      <div
                        className="public-staff-row"
                        key={member.minecraft_uuid}
                      >
                        <div className="public-staff-player">
                          <img
                            src={`https://mc-heads.net/avatar/${member.minecraft_uuid}/40.png`}
                            alt=""
                          />
                          <div>
                            <strong>
                              {member.minecraft_username ?? "Sin nick"}
                            </strong>
                            <small>{member.minecraft_uuid}</small>
                          </div>
                        </div>
                        <select
                          aria-label={`Cargo público de ${member.minecraft_username}`}
                          value={member.role}
                          disabled={!manageable}
                          onChange={(event) =>
                            void savePublicMember(member, {
                              role: event.target.value,
                            })
                          }
                        >
                          {roles
                            .filter(
                              (role) =>
                                (role.priority ?? 0) < actorPriority ||
                                role.key === member.role,
                            )
                            .map((role) => (
                              <option key={role.key} value={role.key}>
                                {role.name}
                              </option>
                            ))}
                        </select>
                        <label className="staff-inline-toggle">
                          <input
                            type="checkbox"
                            checked={member.is_sponsor}
                            disabled={!manageable}
                            onChange={(event) =>
                              void savePublicMember(member, {
                                is_sponsor: event.target.checked,
                              })
                            }
                          />
                          <span>SPONSOR</span>
                        </label>
                        <input
                          className="staff-order-input"
                          type="number"
                          min="0"
                          max="65535"
                          defaultValue={member.display_order}
                          disabled={!manageable}
                          aria-label={`Orden de ${member.minecraft_username}`}
                          onBlur={(event) =>
                            void savePublicMember(member, {
                              display_order: Number(event.target.value),
                            })
                          }
                        />
                        <label className="staff-inline-toggle">
                          <input
                            type="checkbox"
                            checked={member.is_active}
                            disabled={!manageable}
                            onChange={(event) =>
                              void savePublicMember(member, {
                                is_active: event.target.checked,
                              })
                            }
                          />
                          <span>{member.is_active ? "SÍ" : "NO"}</span>
                        </label>
                        <button
                          className="button-muted"
                          type="button"
                          disabled={!manageable}
                          onClick={() => void removePublicMember(member)}
                        >
                          RETIRAR
                        </button>
                      </div>
                    );
                  })}
                  {!staffMembers.length && (
                    <p className="history-empty">
                      NO HAY MIEMBROS PUBLICADOS EN /STAFF
                    </p>
                  )}
                </section>
              )}
              {!permissionsOnly && (
                <div className="staff-directory-toolbar">
                  <label htmlFor="staff-search">
                    BUSCAR CUENTA
                    <input
                      id="staff-search"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Nombre, Minecraft o Discord…"
                    />
                  </label>
                  <span>
                    {verifiedPlayers.length
                      ? `${verifiedPlayers.length} jugadores verificados`
                      : `${visibleUsers.length} de ${users.length} cuentas web`}
                  </span>
                </div>
              )}
              {!permissionsOnly && search.trim().length >= 2 && (
                <div className="verified-results">
                  <small>JUGADORES VERIFICADOS EN LA BASE GLOBAL</small>
                  {verifiedPlayers.map((player) => (
                    <div
                      className="verified-result"
                      key={player.minecraft_uuid}
                    >
                      <div>
                        <strong>{player.minecraft_username}</strong>
                        <span>
                          {player.discord_id
                            ? `Discord ID: ${player.discord_id}`
                            : "Sin Discord vinculado"}
                        </span>
                      </div>
                      <div className="verified-result-actions">
                        {player.user ? (
                          <select
                            aria-label={`Rol de ${player.minecraft_username}`}
                            defaultValue={
                              player.user.roles[0]?.key ?? "sponsor"
                            }
                            onChange={(e) =>
                              void save(player.user!, e.target.value)
                            }
                          >
                            {roles.map((role) => (
                              <option key={role.key} value={role.key}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            className="button-primary"
                            type="button"
                            disabled={!player.discord_id}
                            onClick={() => {
                              setNewName(player.minecraft_username);
                              setNewDiscord(player.discord_id ?? "");
                              setNewUuid(player.minecraft_uuid);
                              setNewMinecraft(player.minecraft_username);
                              setShowAdd(true);
                            }}
                          >
                            ASIGNAR ACCESO
                          </button>
                        )}
                        {!staffMembers.some(
                          (member) =>
                            member.minecraft_uuid === player.minecraft_uuid,
                        ) && (
                          <button
                            className="button-muted"
                            type="button"
                            onClick={() => void publishPlayer(player)}
                          >
                            MOSTRAR EN /STAFF
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!permissionsOnly && (
                <div className="content-table-head">
                  <span>Cuenta</span>
                  <span>Minecraft</span>
                  <span>Discord</span>
                  <span>Rol actual</span>
                  <span>Nuevo rol</span>
                  <span />
                </div>
              )}
              {!permissionsOnly &&
                visibleUsers.map((user) => (
                  <div className="content-table-row" key={user.id}>
                    <strong>{user.name}</strong>
                    <span>{user.minecraft_username ?? "Sin vincular"}</span>
                    <span>{user.discord_username}</span>
                    <span>{user.roles[0]?.name ?? "Sin rol"}</span>
                    <select
                      aria-label={`Rol de ${user.name}`}
                      defaultValue={user.roles[0]?.key ?? "sponsor"}
                      onChange={(e) => void save(user, e.target.value)}
                    >
                      {roles.map((role) => (
                        <option key={role.key} value={role.key}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <span />
                  </div>
                ))}
              {!permissionsOnly && !visibleUsers.length && (
                <p className="history-empty">
                  {users.length
                    ? "NO HAY CUENTAS QUE COINCIDAN CON LA BÚSQUEDA"
                    : "AÚN NO HAY CUENTAS CON ROLES ASIGNADOS"}
                </p>
              )}
              {feedback && (
                <p className="form-feedback" role="status">
                  {feedback}
                </p>
              )}
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
