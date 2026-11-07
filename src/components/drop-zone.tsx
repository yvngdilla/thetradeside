"use client";

import { useRef, useState } from "react";

/**
 * The one drop area for files: drag files onto it or click to browse. Used for
 * workspace documents, reading a past certificate and uploading a signature.
 * What happens with the files is up to the caller.
 */
export function DropZone({
  title,
  hint,
  accept,
  multiple = false,
  busy = null,
  onFiles,
  children,
}: {
  /** Main line, e.g. "Drop a past certificate here". A "browse" link is added after it. */
  title: string;
  hint: React.ReactNode;
  accept: string;
  multiple?: boolean;
  /** While set, the zone is disabled and shows this instead of the title, e.g. "Reading certificate…". */
  busy?: string | null;
  onFiles: (files: File[]) => void;
  /** Optional preview shown above the title, like an uploaded signature. */
  children?: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (input.current) input.current.value = "";
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <label
      aria-busy={Boolean(busy)}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!busy) take(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center gap-1 rounded-md border border-dashed px-6 py-7 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest ${
        over ? "border-forest bg-forest-wash" : "border-control bg-paper hover:border-forest"
      } ${busy ? "cursor-progress" : "cursor-pointer"}`}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={Boolean(busy)}
        onChange={(e) => take(e.currentTarget.files)}
      />
      {children ?? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="pointer-events-none mb-1 h-6 w-6 text-forest"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
        </svg>
      )}
      <span className="pointer-events-none font-semibold">
        {busy ?? (
          <>
            {title} or <span className="text-forest underline underline-offset-2">browse</span>
          </>
        )}
      </span>
      <span className="pointer-events-none text-sm text-muted max-w-md">{hint}</span>
    </label>
  );
}
