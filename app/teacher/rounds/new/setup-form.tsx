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
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Class</span>
        <select name="classId" className="rounded-lg border border-paper-200 bg-white px-3 py-2">
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Passage</span>
        <select
          name="passageId"
          value={passageId}
          onChange={(e) => setPassageId(e.target.value)}
          className="rounded-lg border border-paper-200 bg-white px-3 py-2"
        >
          {passages.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Challenge prompt</span>
        {passagePrompts.length === 0 ? (
          <span className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
            This passage has no prompts yet — add one from the passage page.
          </span>
        ) : (
          <select name="promptId" className="rounded-lg border border-paper-200 bg-white px-3 py-2">
            {passagePrompts.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.promptType}] {p.text.length > 90 ? p.text.slice(0, 90) + "…" : p.text}
              </option>
            ))}
          </select>
        )}
      </label>

      <fieldset className="rounded-xl border border-paper-200 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Phase timers (minutes) — you can extend or pause live</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {TIMERS.map((t) => (
            <label key={t.name} className="flex flex-col gap-1">
              <span className="text-xs text-ink-500">{t.label}</span>
              <input
                name={t.name}
                type="number"
                min={1}
                max={30}
                defaultValue={t.def}
                className="rounded-lg border border-paper-200 px-2 py-1.5"
              />
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="namesHidden" defaultChecked />
        Hide student names on reveal and projection (recommended — you can toggle live)
      </label>

      <button
        type="submit"
        disabled={passagePrompts.length === 0}
        className="self-start rounded-lg bg-accent-600 px-6 py-3 text-lg font-semibold text-white hover:bg-accent-500 disabled:opacity-50"
      >
        Open the lobby →
      </button>
    </form>
  );
}
