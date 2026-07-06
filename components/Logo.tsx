import Link from "next/link";

/**
 * Teal underline that ends in a speech-bubble tail — the signature stroke
 * under the wordmark on the brand board.
 */
function UnderlineTail({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 34"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
      fill="none"
    >
      <path
        d="M2 5 H306 L322 29 L330 5 H398"
        stroke="var(--color-teal-500)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Compact wordmark for navigation bars. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex flex-col no-underline">
      <span className="inline-flex items-start gap-0.5">
        <span aria-hidden className="-mt-0.5 font-serif text-base font-bold leading-none text-teal-500">
          &ldquo;
        </span>
        <span className="display hl-mark text-2xl tracking-tight">Receipts</span>
      </span>
      <UnderlineTail className="ml-3 h-2 w-[6.2rem]" />
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

/** A grey "text line" bar for the receipt sheet artwork. */
function SheetLine({ w, hl = false }: { w: string; hl?: boolean }) {
  return (
    <div
      className={`h-[7px] rounded-sm ${hl ? "bg-mark-400" : "bg-[#c9c4b8]"}`}
      style={{ width: w, boxShadow: hl ? "0 0 0 3px var(--color-mark-400)" : undefined }}
    />
  );
}

/**
 * The primary logo, reproduced from the brand board: a jagged receipt sheet
 * with teal quotes, ruled lines, a yellow-highlighted line, a checkbox, and
 * handwritten "Show your proof." — with the wordmark and its speech-bubble
 * underline running across the sheet, wider than the paper.
 */
export function PrimaryLogo() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* The receipt sheet */}
        <div
          className="receipt-jagged relative w-[19rem] px-7 pb-8 pt-7 sm:w-[21rem]"
          style={{
            background:
              "radial-gradient(120% 90% at 20% 0%, #fffef9 0%, #fbf7ec 55%, #f6f0e0 100%)",
            boxShadow: "0 14px 34px -16px rgba(15,29,45,0.35), 0 3px 10px rgba(15,29,45,0.12)",
          }}
        >
          {/* Quote mark + top text lines */}
          <div className="flex items-start gap-3">
            <span aria-hidden className="-mt-3 font-serif text-6xl font-bold leading-none text-teal-500">
              &ldquo;
            </span>
            <div className="mt-1 flex grow flex-col gap-2.5">
              <SheetLine w="92%" />
              <SheetLine w="78%" />
            </div>
          </div>
          <div className="mt-2.5 flex flex-col gap-2.5">
            <SheetLine w="58%" hl />
            <SheetLine w="86%" />
          </div>

          {/* Space the wordmark occupies (rendered below, overflowing the sheet) */}
          <div className="h-24 sm:h-26" />

          {/* Checkbox + lower text lines */}
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 34 34" className="h-8 w-8 shrink-0" aria-hidden fill="none">
              <rect x="2" y="2" width="30" height="30" rx="4" stroke="var(--color-teal-500)" strokeWidth="3.5" />
              <path
                d="M9 17.5l6 6L26 11"
                stroke="var(--color-teal-500)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex grow flex-col gap-2.5">
              <SheetLine w="88%" />
              <SheetLine w="66%" />
            </div>
          </div>

          {/* Handwritten descriptor */}
          <div
            className="mt-3 -rotate-2 text-right text-3xl text-teal-600"
            style={{ fontFamily: "var(--font-script), cursive", fontWeight: 700 }}
          >
            Show your proof.
            <svg viewBox="0 0 160 10" className="ml-auto -mt-1 h-2 w-36" aria-hidden fill="none">
              <path d="M4 6 C40 1, 120 1, 156 5" stroke="var(--color-teal-500)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Wordmark + speech-tail underline, wider than the sheet */}
        <div className="pointer-events-none absolute left-1/2 top-[8.2rem] w-max -translate-x-1/2 sm:top-[8.6rem]">
          <h1 className="display whitespace-nowrap text-[5.4rem] leading-none tracking-tight sm:text-[6.2rem]">
            Receipts
          </h1>
          <UnderlineTail className="mt-1 h-7 w-full" />
        </div>
      </div>

      <p className="accent-label mt-7 text-base tracking-[0.22em] text-navy-950">
        Evidence. Claims. Proof.
      </p>
    </div>
  );
}
