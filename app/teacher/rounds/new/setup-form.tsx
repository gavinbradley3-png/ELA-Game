"use client";

import { useMemo, useState } from "react";

interface Props {
  action: (formData: FormData) => void;
  classes: { id: string; name: string }[];
  passages: { id: string; title: string }[];
  prompts: { id: string; passageId: string; text: string; promptType: string }[];
  initialPassageId?: string;
}

const TIMERS = [
  { name: "readingMinutes", label: "Reading", def: 6 },
  { name: "annotatingMinutes", label: "Annotating", def: 5 },
  { name: "submittingMinutes", label: "Submitting", def: 8 },
  { name: "reviewMinutes", label: "Peer review", def: 6 },
  { name: "revisingMinutes", label: "Revising", def: 6 },
];

export function RoundSetupForm({ action, classes, passages, prompts, initialPassageId }: Props) {
  const firstPassage = initialPassageId && passages.some((p) => p.id === initialPassageId)
    ? initialPassageId
    : passages[0]?.id ?? "";
  const [passageId, setPassageId] = useState(firstPassage);
  const passagePrompts = useMemo(
    () => prompts.filter((p) => p.passageId === passageId),
    [prompts, passageId],
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="accent-label text-muted-500">Class</span>
        <select name="classId" className="field">
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="accent-label text-muted-500">Passage</span>
        <select name="passageId" value={passageId} onChange={(e) => setPassageId(e.target.value)} className="field">
          {passages.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="accent-label text-muted-500">Challenge prompt</span>
        {passagePrompts.length === 0 ? (
          <span className="rounded-xl border-2 border-mark-400 bg-mark-300/40 px-3 py-2 text-sm text-ink-900/80">
            This passage has no prompts yet — add one from the passage page.
          </span>
        ) : (
          <select name="promptId" className="field">
            {passagePrompts.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.promptType}] {p.text.length > 90 ? p.text.slice(0, 90) + "…" : p.text}
              </option>
            ))}
          </select>
        )}
      </label>

      <fieldset className="card p-4">
        <legend className="display px-1 text-xl">Phase timers (minutes) — extend or pause live</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {TIMERS.map((t) => (
            <label key={t.name} className="flex flex-col gap-1">
              <span className="text-xs text-muted-500">{t.label}</span>
              <input name={t.name} type="number" min={1} max={30} defaultValue={t.def} className="field px-2 py-1.5" />
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-ink-900/80">
        <input type="checkbox" name="namesHidden" defaultChecked className="h-4 w-4 accent-teal-500" />
        Hide student names on reveal and projection (recommended — you can toggle live)
      </label>

      <button type="submit" disabled={passagePrompts.length === 0} className="btn btn-primary display self-start px-8 py-3 text-3xl">
        Open the lobby →
      </button>
    </form>
  );
}
