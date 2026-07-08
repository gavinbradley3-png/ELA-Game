import type { Passage } from "@/lib/db";

export function PassageFormFields({ passage }: { passage?: Passage }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="accent-label text-muted-500">Title *</span>
          <input name="title" required defaultValue={passage?.title} placeholder="The Missing Project" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Source / author</span>
          <input name="source" defaultValue={passage?.source ?? ""} className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Genre</span>
          <input name="genre" defaultValue={passage?.genre ?? ""} placeholder="Short story excerpt" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Grade level</span>
          <input name="gradeLevel" defaultValue={passage?.gradeLevel ?? ""} placeholder="8" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Estimated reading time (minutes)</span>
          <input name="readingTimeMinutes" type="number" min={1} max={30} defaultValue={passage?.readingTimeMinutes ?? ""} className="field" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="accent-label text-muted-500">Passage text *</span>
        <textarea
          name="text"
          required
          rows={14}
          defaultValue={passage?.text}
          placeholder="Paste the passage here. Keep paragraph breaks — students see exactly this text."
          className="field font-serif leading-relaxed"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Vocabulary notes (students can view)</span>
          <textarea
            name="vocabNotes"
            rows={3}
            defaultValue={passage?.vocabNotes ?? ""}
            placeholder={"defensive — protecting yourself from criticism\nsmirk — a smug smile"}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Teacher notes (private)</span>
          <textarea
            name="teacherNotes"
            rows={3}
            defaultValue={passage?.teacherNotes ?? ""}
            placeholder="Watch for students misreading the ending…"
            className="field"
          />
        </label>
      </div>
    </>
  );
}
