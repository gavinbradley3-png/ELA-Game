/** Annotation tags per DESIGN.md §15. MVP ships the core set. */

export interface AnnotationTag {
  id: string;
  label: string;
  /** Tailwind-friendly highlight color token used by PassageView. */
  color: string;
  hint: string;
}

export const ANNOTATION_TAGS: AnnotationTag[] = [
  { id: "evidence", label: "Important Evidence", color: "amber", hint: "Text that could prove a claim about the prompt." },
  { id: "character", label: "Character", color: "sky", hint: "Words or actions that reveal who a character is or what they want." },
  { id: "theme", label: "Theme", color: "violet", hint: "A moment that points at the passage's bigger idea." },
  { id: "conflict", label: "Conflict", color: "rose", hint: "Tension or struggle between characters, ideas, or forces." },
  { id: "tone", label: "Tone", color: "teal", hint: "Word choices that show the author's attitude." },
  { id: "inference", label: "Inference", color: "lime", hint: "A clue that implies something the text doesn't say directly." },
  { id: "symbolism", label: "Symbolism", color: "fuchsia", hint: "An object or image that stands for something bigger." },
  { id: "craft", label: "Author's Craft", color: "orange", hint: "A deliberate technique: imagery, repetition, structure." },
  { id: "question", label: "Question", color: "slate", hint: "Something you want to ask or that needs discussion." },
  { id: "confusion", label: "Confusion", color: "zinc", hint: "A part you don't understand yet. Flagging it is smart, not weak." },
];

export const TAG_BY_ID: Record<string, AnnotationTag> = Object.fromEntries(
  ANNOTATION_TAGS.map((t) => [t.id, t]),
);

export const PROMPT_TYPES = [
  "Theme",
  "Character motivation",
  "Conflict",
  "Tone",
  "Inference",
  "Author's purpose",
  "Argument analysis",
  "Symbolism",
  "Compare and contrast",
  "Best evidence",
  "Most defensible claim",
] as const;

export const PEER_CRITERIA = [
  { id: "evidence", label: "Stronger evidence" },
  { id: "explanation", label: "Clearer explanation" },
  { id: "connection", label: "Better connection to the prompt" },
  { id: "depth", label: "Deeper thinking" },
  { id: "accuracy", label: "More accurate reading of the text" },
] as const;

export const CONFIDENCE_LABELS = ["", "Not sure", "Somewhat sure", "Confident", "Very confident"];
