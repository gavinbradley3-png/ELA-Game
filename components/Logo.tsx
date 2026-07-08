import Link from "next/link";

/* ---------------------------------------------------------------------------
 * Receipts brand marks, reproduced from the brand board.
 * Everything is code (SVG/CSS) so it stays crisp at any size.
 * ------------------------------------------------------------------------- */

/** Paper-grain texture as an inline SVG data URI (feTurbulence). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

/**
 * Teal underline with the speech-bubble tail: runs flat, dips into a shallow
 * long-side / steep return tail near the right end, then continues.
 */
export function UnderlineTail({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 34" preserveAspectRatio="none" className={className} aria-hidden fill="none">
      <path
        d="M3 6 H298 L318 29 L323 6 H397"
        stroke="var(--color-teal-500)"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Solid teal opening quotes ("66" orientation), matching the board. */
export function QuoteGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 74" className={className} aria-hidden fill="var(--color-teal-500)">
      <g transform="rotate(180 50 37)">
        <path d="M8 14 A14 14 0 0 1 22 0 H32 A12 12 0 0 1 44 12 V34 C44 54 32 68 12 74 L7 63 C18 58 24 50 25 42 H20 A12 12 0 0 1 8 30 Z" />
        <path d="M56 14 A14 14 0 0 1 70 0 H80 A12 12 0 0 1 92 12 V34 C92 54 80 68 60 74 L55 63 C66 58 72 50 73 42 H68 A12 12 0 0 1 56 30 Z" />
      </g>
    </svg>
  );
}

/** Teal checkbox with the check overflowing past the top-right corner. */
function CheckboxOverflow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 52" className={className} aria-hidden fill="none" style={{ overflow: "visible" }}>
      <rect x="3" y="10" width="40" height="40" rx="7" stroke="var(--color-teal-500)" strokeWidth="4.5" />
      <path
        d="M13 30 L23 40 L52 4"
        stroke="var(--color-teal-500)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Grey "text line" bar with rounded ends, as on the board's receipt sheet. */
function SheetLine({ w, className = "" }: { w: string; className?: string }) {
  return <div className={`h-[7px] rounded-full bg-[#c9c5ba] ${className}`} style={{ width: w }} />;
}

/** The yellow marker stroke — organic, slightly rotated. */
function MarkerBar({ w, className = "" }: { w: string; className?: string }) {
  return (
    <div
      className={`h-[15px] -rotate-1 rounded-[3px] bg-mark-400 ${className}`}
      style={{ width: w, boxShadow: "1px 1px 0 rgba(15,29,45,0.06)" }}
    />
  );
}

/** Teal-outline speech bubble containing quotes — the descriptor icon. */
export function QuoteBubbleIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <path
        d="M14 6 H50 A8 8 0 0 1 58 14 V42 A8 8 0 0 1 50 50 H26 L12 61 L14.5 50 H14 A8 8 0 0 1 6 42 V14 A8 8 0 0 1 14 6 Z"
        stroke="var(--color-teal-500)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <g transform="translate(17 18) scale(0.30) rotate(180 50 37)">
        <path d="M8 14 A14 14 0 0 1 22 0 H32 A12 12 0 0 1 44 12 V34 C44 54 32 68 12 74 L7 63 C18 58 24 50 25 42 H20 A12 12 0 0 1 8 30 Z" fill="var(--color-teal-500)" />
        <path d="M56 14 A14 14 0 0 1 70 0 H80 A12 12 0 0 1 92 12 V34 C92 54 80 68 60 74 L55 63 C66 58 72 50 73 42 H68 A12 12 0 0 1 56 30 Z" fill="var(--color-teal-500)" />
      </g>
    </svg>
  );
}

/** Curved swoosh used under "proof." in the descriptor. */
function Swoosh({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" preserveAspectRatio="none" className={className} aria-hidden fill="none">
      <path d="M4 8 C34 2 86 2 116 7" stroke="var(--color-teal-500)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Brand descriptor lockup: quote bubble + "Show your proof." with swoosh. */
export function DescriptorLockup({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <QuoteBubbleIcon className="h-9 w-9 shrink-0" />
      <span className="display text-3xl tracking-tight">
        Show your{" "}
        <span className="relative inline-block">
          proof
          <Swoosh className="absolute -bottom-1.5 left-0 h-2.5 w-[108%]" />
        </span>
        .
      </span>
    </span>
  );
}

/** Compact wordmark for navigation bars. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex flex-col no-underline">
      <span className="inline-flex items-start gap-1">
        <QuoteGlyph className="mt-0.5 h-3.5 w-5" />
        <span className="display hl-mark text-2xl tracking-tight">Receipts</span>
      </span>
      <UnderlineTail className="ml-5 h-2 w-[6.4rem]" />
    </Link>
  );
}

export function BrandDescriptor({ className = "" }: { className?: string }) {
  return (
    <span className={`accent-label text-teal-600 ${className}`}>Evidence. Claims. Proof.</span>
  );
}

/** Teal check in a circle — the brand's confirmation mark. */
export function Check({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`check-draw ${className}`} aria-hidden>
      <circle cx="10" cy="10" r="9" fill="var(--color-teal-500)" />
      <path d="M5.5 10.5l3 3 6-6.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The primary logo, faithful to the brand board: a textured receipt sheet
 * (jagged top and bottom, soft shadow) carrying teal quotes, grey ruled
 * lines, a yellow marker stroke, an overflowing teal checkbox, and the
 * handwritten "Show your proof." chip — with the capital-R wordmark and its
 * speech-tail underline running wider than the paper.
 */
export function PrimaryLogo() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* drop-shadow lives on the wrapper so the jagged clip-path doesn't clip it */}
        <div style={{ filter: "drop-shadow(0 14px 22px rgba(15,29,45,0.22)) drop-shadow(0 3px 6px rgba(15,29,45,0.10))" }}>
          <div
            className="receipt-jagged relative w-[21rem] px-7 pb-7 pt-8 sm:w-[24rem] sm:px-8"
            style={{
              background:
                "radial-gradient(130% 100% at 25% 0%, #fffef9 0%, #fbf7ec 55%, #f5efdf 100%)",
            }}
          >
            {/* paper grain */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: GRAIN, opacity: 0.05, mixBlendMode: "multiply" }}
            />

            {/* quotes + top text lines */}
            <div className="flex items-start gap-4">
              <QuoteGlyph className="h-12 w-16 shrink-0 sm:h-14 sm:w-[4.5rem]" />
              <div className="mt-1 flex grow flex-col gap-3">
                <SheetLine w="96%" />
                <SheetLine w="74%" />
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              <MarkerBar w="52%" className="ml-[16%]" />
              <SheetLine w="88%" className="ml-[4%]" />
            </div>

            {/* space the wordmark occupies (rendered below, overflowing the sheet) */}
            <div className="h-[7.5rem] sm:h-[8.5rem]" />

            {/* checkbox + lower text lines */}
            <div className="flex items-center gap-4">
              <CheckboxOverflow className="h-11 w-[3.4rem] shrink-0" />
              <div className="flex grow flex-col gap-3">
                <SheetLine w="90%" />
                <SheetLine w="64%" />
              </div>
            </div>

            {/* bottom row: line + handwritten chip */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <SheetLine w="26%" />
              <div className="relative -rotate-2 rounded-md bg-[#fffef9] px-3 pb-2 pt-0.5 shadow-[0_1px_4px_rgba(15,29,45,0.14)]">
                <span
                  className="text-[1.55rem] leading-none text-teal-600"
                  style={{ fontFamily: "var(--font-script), cursive", fontWeight: 700 }}
                >
                  Show your proof.
                </span>
                <svg viewBox="0 0 160 8" className="mt-0.5 h-1.5 w-full" aria-hidden fill="none">
                  <path d="M4 5 C44 1 116 1 156 4" stroke="var(--color-teal-500)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* wordmark + speech-tail underline, wider than the sheet */}
        <div className="pointer-events-none absolute left-1/2 top-[7.6rem] w-max -translate-x-1/2 sm:top-[8.4rem]">
          <h1 className="display whitespace-nowrap text-[5.9rem] leading-none tracking-[-0.03em] sm:text-[6.8rem]">
            Receipts
          </h1>
          <UnderlineTail className="mt-1.5 h-7 w-full" />
        </div>
      </div>

      <p
        className="mt-8 text-lg font-bold tracking-[0.22em] text-navy-950"
        style={{ fontFamily: "var(--font-accent), sans-serif" }}
      >
        EVIDENCE. CLAIMS. PROOF.
      </p>
    </div>
  );
}
