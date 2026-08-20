"use client";

import { FormEvent, useState } from "react";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";

const recentContent = [
  { type: "COMUNICADO", title: "Comienza la Temporada 04", status: "PUBLICADO", author: "KekeAdmin", date: "11 AGO 2026" },
  { type: "REGLAMENTO", title: "Reglas de Minecraft v2.4", status: "PUBLICADO", author: "ModTeam", date: "09 AGO 2026" },
  { type: "EVENTO", title: "Draft de Capitanes", status: "BORRADOR", author: "EventManager", date: "08 AGO 2026" },
];

export default function StaffContentPage() {
  const [contentType, setContentType] = useState("Comunicado");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [feedback, setFeedback] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("Vista previa actualizada. El guardado permanente se activará al conectar el backend.");
  }

  return (
    <main>
      <SiteHeader active="staff" />
      <section className="staff-header">
        <div><p className="eyebrow"><span>PANEL DE STAFF</span> GESTIÓN DE CONTENIDO</p><h1>PUBLICAR<br />INFORMACIÓN.</h1></div>
        <div className="staff-identity"><small>SESIÓN ACTUAL</small><strong>KekeAdmin</strong><span>Administrador</span></div>
      </section>

      <section className="staff-workspace">
        <aside className="staff-sidebar">
          <small>CONTENIDO</small>
          <button className="is-active" type="button">Crear publicación</button>
          <button type="button">NEWS</button>
          <button type="button">Reglamentos</button>
          <button type="button">Eventos</button>
          <span />
          <small>CONFIGURACIÓN</small>
          <button type="button">Permisos del staff</button>
          <button type="button">Historial de cambios</button>
        </aside>

        <div className="staff-main">
          <div className="staff-section-heading"><div><small>NUEVA ENTRADA</small><h2>CREAR PUBLICACIÓN</h2></div><span>Los campos marcados son obligatorios</span></div>
          <div className="editor-grid">
            <form className="content-form" onSubmit={handleSubmit}>
              <label>Tipo de contenido<select value={contentType} onChange={(event) => setContentType(event.target.value)}><option>Comunicado</option><option>Regla</option><option>Evento</option></select></label>
              <label>Título<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Escribe un título claro" /></label>
              <div className="form-row">
                <label>Categoría<select><option>Competitivo</option><option>Mantenimiento</option><option>Comunidad</option><option>Administración</option></select></label>
                <label>Estado<select><option>Borrador</option><option>Publicado</option><option>Programado</option></select></label>
              </div>
              <label>Resumen<textarea required rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Explica lo más importante en pocas líneas" /></label>
              <label>Contenido completo<textarea required rows={9} placeholder="Redacta aquí toda la publicación" /></label>
              <div className="form-row">
                <label>Fecha del evento o publicación<input type="datetime-local" /></label>
                <label>Imagen de portada<input accept="image/png,image/jpeg,image/webp" type="file" /></label>
              </div>
              <div className="form-actions"><button className="button-muted" type="button">GUARDAR BORRADOR</button><button className="button-primary" type="submit">ACTUALIZAR VISTA PREVIA</button></div>
              {feedback && <p className="form-feedback" role="status">{feedback}</p>}
            </form>

            <aside className="content-preview">
              <div className="preview-label"><span>VISTA PREVIA</span><small>PÚBLICO</small></div>
              <div className="preview-art"><span>{contentType.toUpperCase().slice(0, 3)}</span></div>
              <div className="preview-copy"><small>{contentType.toUpperCase()} · BORRADOR</small><h3>{title || "Título de la publicación"}</h3><p>{summary || "El resumen aparecerá aquí para que puedas revisar cómo lo verán los jugadores antes de publicar."}</p><span>KEKE NETWORK · HOY</span></div>
            </aside>
          </div>

          <div className="recent-content">
            <div className="staff-section-heading"><div><small>ACTIVIDAD</small><h2>CONTENIDO RECIENTE</h2></div></div>
            <div className="content-table-head"><span>Tipo</span><span>Título</span><span>Estado</span><span>Autor</span><span>Fecha</span><span>Acción</span></div>
            {recentContent.map((item) => (
              <div className="content-table-row" key={item.title}><span>{item.type}</span><strong>{item.title}</strong><span className={item.status === "PUBLICADO" ? "status-live" : "status-draft"}>{item.status}</span><span>{item.author}</span><span>{item.date}</span><button type="button">EDITAR</button></div>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
