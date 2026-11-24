// A cut-paper shape that sits behind the main thing on a screen. Decorative only.
// The parent needs `relative`; give the shape its size and offset with className.

const PATHS = [
  "M120 70 C 260 -10, 520 40, 720 22 C 900 6, 995 140, 965 320 C 940 480, 820 596, 600 572 C 420 552, 250 604, 120 524 C 6 452, -12 170, 120 70 Z",
  "M90 110 C 220 10, 480 60, 700 30 C 890 4, 1000 160, 960 330 C 925 490, 780 580, 580 560 C 400 545, 240 610, 110 520 C 0 440, -20 200, 90 110 Z",
  "M150 60 C 330 0, 560 70, 760 40 C 930 16, 1010 190, 950 350 C 900 500, 760 600, 560 566 C 380 536, 230 596, 100 500 C -10 410, 10 130, 150 60 Z",
] as const;

const TONES = {
  terracotta: "text-terracotta",
  sage: "text-sage",
  ochre: "text-ochre",
  blush: "text-blush",
  sky: "text-sky",
} as const;

export function PaperShape({
  tone,
  cut = 0,
  className = "-inset-x-[4%] -inset-y-[16%]",
}: {
  tone: keyof typeof TONES;
  cut?: 0 | 1 | 2;
  className?: string;
}) {
  return (
    <div aria-hidden className={`pointer-events-none absolute ${TONES[tone]} ${className}`}>
      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" className="h-full w-full">
        <path d={PATHS[cut]} fill="currentColor" />
      </svg>
    </div>
  );
}

/** A handwritten aside with a drawn arrow, shown beside a form on wide screens only. */
export function HandNote({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p aria-hidden className={`t-hand !text-ink pointer-events-none absolute hidden w-40 text-center xl:block ${className}`}>
      {children}
    </p>
  );
}

export function HandArrow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 60" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={`block h-12 w-20 ${className}`}>
      <path d="M6 6 C 20 34, 50 46, 90 40" />
      <path d="M76 30 L91 40 L77 51" />
    </svg>
  );
}
