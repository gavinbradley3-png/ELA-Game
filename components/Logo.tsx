import Link from "next/link";

/**
 * Receipts wordmark per the brand board: teal opening quotes, League Spartan
 * navy wordmark over a yellow highlighter swipe, teal underline.
 */
export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  const text = size === "lg" ? "text-7xl sm:text-8xl" : "text-2xl";
  const quote = size === "lg" ? "text-5xl -mr-2" : "text-lg -mr-0.5";
  return (
    <Link href={href} className="inline-flex items-end gap-1 no-underline">
      <span aria-hidden className={`${quote} font-serif font-bold leading-none text-teal-500`}>
        &ldquo;
      </span>
      <span className={`display ${text} hl-mark teal-underline lowercase tracking-tight`}>
        Receipts
      </span>
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
