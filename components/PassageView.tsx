"use client";

import { useCallback, useRef } from "react";
import { TAG_BY_ID } from "@/lib/tags";

export interface HighlightRange {
  id: string;
  startOffset: number;
  endOffset: number;
  tag: string;
}

interface Props {
  text: string;
  highlights?: HighlightRange[];
  /** Range outlined as the currently chosen evidence quote. */
  evidenceRange?: { start: number; end: number } | null;
  selectable?: boolean;
  onSelectRange?: (start: number, end: number, text: string) => void;
  fontScale?: number;
}

/**
 * Renders the passage as one pre-wrapped text block whose rendered characters
 * exactly equal `text`, so DOM Range string lengths map 1:1 to passage
 * offsets. Highlights are span wrappers that add no characters.
 */
export function PassageView({ text, highlights = [], evidenceRange, selectable, onSelectRange, fontScale = 1 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelection = useCallback(() => {
    if (!selectable || !onSelectRange || !containerRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return;

    const preRange = document.createRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    let start = preRange.toString().length;
    let end = start + range.toString().length;

    // Trim whitespace from the edges of the selection.
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    if (end <= start) return;

    onSelectRange(start, end, text.slice(start, end));
  }, [selectable, onSelectRange, text]);

  // Split the passage into segments at every highlight/evidence boundary.
  const boundaries = new Set<number>([0, text.length]);
  for (const h of highlights) {
    boundaries.add(clamp(h.startOffset, text.length));
    boundaries.add(clamp(h.endOffset, text.length));
  }
  if (evidenceRange) {
    boundaries.add(clamp(evidenceRange.start, text.length));
    boundaries.add(clamp(evidenceRange.end, text.length));
  }
  const points = [...boundaries].sort((a, b) => a - b);

  const segments: { start: number; end: number; classes: string; label: string }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [start, end] = [points[i], points[i + 1]];
    if (start >= end) continue;
    const covering = highlights.filter((h) => h.startOffset <= start && h.endOffset >= end);
    const isEvidence = !!evidenceRange && evidenceRange.start <= start && evidenceRange.end >= end;
    const tag = covering.length > 0 ? TAG_BY_ID[covering[covering.length - 1].tag] : undefined;
    const classes = [tag ? `hl-${tag.color}` : "", isEvidence ? "hl-evidence-pick" : ""].filter(Boolean).join(" ");
    const label = [
      ...new Set(covering.map((h) => TAG_BY_ID[h.tag]?.label).filter(Boolean)),
      isEvidence ? "Your evidence" : "",
    ]
      .filter(Boolean)
      .join(", ");
    segments.push({ start, end, classes, label });
  }

  return (
    <div
      ref={containerRef}
      onMouseUp={handleSelection}
      onTouchEnd={handleSelection}
      className={`passage-text rounded-xl border border-paper-200 bg-white p-6 ${selectable ? "cursor-text select-text" : ""}`}
      style={{ fontSize: `${1.125 * fontScale}rem` }}
    >
      {segments.map((seg) =>
        seg.classes ? (
          <mark key={seg.start} className={`${seg.classes} rounded-sm bg-transparent`} title={seg.label || undefined}>
            {text.slice(seg.start, seg.end)}
          </mark>
        ) : (
          <span key={seg.start}>{text.slice(seg.start, seg.end)}</span>
        ),
      )}
    </div>
  );
}

function clamp(n: number, max: number): number {
  return Math.max(0, Math.min(max, n));
}
