"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Opening their website",
  "Finding their trade program",
  "Reading how they take certificates",
  "Filling in the details",
];

/**
 * What the lookup is doing, one step at a time. The lookup reports no progress
 * of its own, so steps advance on a gentle timer and the last one waits until
 * the page refreshes with the result.
 */
export function LookupProgress({ domain, startedAt }: { domain: string; startedAt: string }) {
  const elapsed = () => (Date.now() - new Date(startedAt).getTime()) / 1000;
  const stepFor = (s: number) => Math.min(STEPS.length - 1, Math.floor(s / 9));
  const [step, setStep] = useState(() => stepFor(elapsed()));

  useEffect(() => {
    const t = setInterval(() => setStep(stepFor(elapsed())), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt]);

  return (
    <div>
      <p className="text-muted mb-4">Reading {domain}. This usually takes under a minute.</p>
      <ol className="space-y-2.5" aria-live="polite">
        {STEPS.slice(0, step + 1).map((label, i) => (
          <li key={label} className="step-item flex items-center gap-3 text-[15px]">
            {i < step ? (
              <span aria-hidden className="w-[14px] h-[14px] rounded-full bg-forest grid place-items-center">
                <svg viewBox="0 0 10 10" className="w-2 h-2 text-on-forest" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M2 5.2 4.2 7.2 8 2.8" />
                </svg>
              </span>
            ) : (
              <span aria-hidden className="step-spinner" />
            )}
            <span className={i < step ? "text-muted" : "text-ink"}>{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
