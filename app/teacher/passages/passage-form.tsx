import type { Passage } from "@/lib/db";

export function PassageFormFields({ passage }: { passage?: Passage }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-medium">Title *</span>
          <input name="title" required defaultValue={passage?.title}
            placeholder="The Missing Project" className="rounded-lg border border-paper-200 bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Source / author</span>
          <input name="source" defaultValue={passage?.source ?? ""} className="rounded-lg border border-paper-200 bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Genre</span>
          <input name="genre" defaultValue={passage?.genre ?? ""} placeholder="Short story excerpt" className="rounded-lg border border-paper-200 bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Grade level</span>
          <input name="gradeLevel" defaultValue={passage?.gradeLevel ?? ""} placeholder="8" className="rounded-lg border border-paper-200 bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Estimated reading time (minutes)</span>
          <input name="readingTimeMinutes" type="number" min={1} max={30}
            defaultValue={passage?.readingTimeMinutes ?? ""} className="rounded-lg border border-paper-200 bg-white px-3 py-2" />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Passage text *</span>
        <textarea name="text" required rows={14} defaultValue={passage?.text}
          placeholder="Paste the passage here. Keep paragraph breaks — students see exactly this text."
          className="rounded-lg border border-paper-200 bg-white px-3 py-2 font-serif leading-relaxed" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Vocabulary notes (students can view these)</span>
          <textarea name="vocabNotes" rows={3} defaultValue={passage?.vocabNotes ?? ""}
            placeholder={"defensive — protecting yourself from criticism\nsmirk — a smug smile"}
            className="rounded-lg border border-paper-200 bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Teacher notes (private)</span>
          <textarea name="teacherNotes" rows={3} defaultValue={passage?.teacherNotes ?? ""}
            placeholder="Watch for students misreading the ending..."
            className="rounded-lg border border-paper-200 bg-white px-3 py-2" />
        </label>
      </div>
    </>
  );
}
