"use client";

import { ReactNode, TextareaHTMLAttributes, useLayoutEffect, useRef } from "react";

type RichTextEditorProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
};

function inlineMarkdown(value: string): ReactNode[] {
  const parts = value.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : part);
}

export function RichText({ value, className = "" }: { value: string; className?: string }) {
  const blocks = value.replace(/\r\n/g, "\n").split("\n");
  return (
    <div className={`rich-text ${className}`.trim()}>
      {blocks.map((line, index) => {
        if (line.startsWith("### ")) return <h4 key={index}>{inlineMarkdown(line.slice(4))}</h4>;
        if (line.startsWith("## ")) return <h3 key={index}>{inlineMarkdown(line.slice(3))}</h3>;
        if (line.startsWith("# ")) return <h2 key={index}>{inlineMarkdown(line.slice(2))}</h2>;
        if (line.startsWith("- ")) return <p className="rich-list-item" key={index}>{inlineMarkdown(line.slice(2))}</p>;
        if (!line.trim()) return <span className="rich-spacer" aria-hidden="true" key={index} />;
        return <p key={index}>{inlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

export function RichTextEditor({ value, onChange, className = "", ...props }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 92)}px`;
  }

  useLayoutEffect(resize, [value]);

  function wrapSelection(prefix: string, suffix = prefix) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || "texto";
    const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  function makeHeading(level: 1 | 2 | 3) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lineStart = value.lastIndexOf("\n", Math.max(textarea.selectionStart - 1, 0)) + 1;
    const lineEndCandidate = value.indexOf("\n", textarea.selectionEnd);
    const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;
    const line = value.slice(lineStart, lineEnd).replace(/^#{1,3}\s+/, "");
    const prefix = `${"#".repeat(level)} `;
    onChange(`${value.slice(0, lineStart)}${prefix}${line}${value.slice(lineEnd)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length + line.length);
    });
  }

  return (
    <div className={`rich-editor ${className}`.trim()}>
      <div className="rich-toolbar" role="toolbar" aria-label="Formato del texto">
        <button type="button" onClick={() => wrapSelection("**")} title="Negrita"><strong>B</strong></button>
        <button type="button" onClick={() => makeHeading(1)} title="Título grande">T1</button>
        <button type="button" onClick={() => makeHeading(2)} title="Título mediano">T2</button>
        <button type="button" onClick={() => makeHeading(3)} title="Subtítulo">T3</button>
        <span>Selecciona texto y aplica formato</span>
      </div>
      <textarea
        {...props}
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onInput={resize}
      />
    </div>
  );
}
