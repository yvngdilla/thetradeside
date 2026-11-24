"use client";

import { useState } from "react";

/** Shows a block of text with one button that copies it. */
export function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <pre className="whitespace-pre-wrap rounded-[var(--radius-md)] border border-rule bg-paper px-4 py-3 font-sans text-[15px] leading-6">{text}</pre>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          className="btn btn-quiet !py-1.5 !px-4"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }}
        >
          Copy
        </button>
        <span role="status" className="text-sm text-good">
          {copied ? "Copied" : ""}
        </span>
      </div>
    </div>
  );
}
