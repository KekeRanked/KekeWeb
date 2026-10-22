import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the KEKE homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>KEKE — Ranked Minecraft Network<\/title>/i);
  assert.match(html, /TU PARTIDA\./);
  assert.match(html, /TU RANGO\./);
  assert.match(html, /AGENDA/);
  assert.match(html, /EVENTOS/);
  assert.match(html, /TEMPORADA 01/);
  assert.doesNotMatch(html, /TEMPORADA BETA|BETA ACTIVA/);
  assert.match(html, /href="\/eventos"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("keeps tournament registration wired to the public event and staff form", async () => {
  const [eventDetail, registrationForm, teamsPanel, staffPage, migration] = await Promise.all([
    readFile(new URL("../app/eventos/[slug]/event-detail-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/eventos/[slug]/tournament-registration-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/eventos/[slug]/tournament-teams.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/staff/contenido/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../backend/database/migrations/2026_10_13_000100_create_tournament_registrations_tables.php", import.meta.url), "utf8"),
  ]);

  assert.match(eventDetail, /metadata\.type === "tournament"/);
  assert.match(eventDetail, /<TournamentRegistrationForm slug=\{slug\}/);
  assert.match(eventDetail, /INFORMACIÓN/);
  assert.match(eventDetail, /REGISTRO/);
  assert.match(eventDetail, /TEAMS/);
  assert.match(eventDetail, /<TournamentTeams slug=\{slug\}/);
  assert.match(registrationForm, /INSCRIBE A TU EQUIPO/);
  assert.match(registrationForm, /registration-players/);
  assert.match(registrationForm, /CUENTA REGISTRADA Y VERIFICADA/);
  assert.match(staffPage, /registration_open/);
  assert.match(staffPage, /Abrir registro al publicar/);
  assert.match(staffPage, /CONFIGURACIÓN DEL DRAFT/);
  assert.match(staffPage, /DATOS DEL TORNEO/);
  assert.match(staffPage, /EDITAR #\{item\.id\}/);
  assert.match(staffPage, /method: editingId \? "PUT" : "POST"/);
  assert.match(teamsPanel, /TEAMS REGISTRADOS/);
  assert.match(teamsPanel, /\/teams/);
  assert.match(migration, /tournament_registrations/);
  assert.match(migration, /tournament_registration_members/);
});
