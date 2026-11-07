"use client";

import { useId, useRef, useState } from "react";

/**
 * One file input that looks like a place to drop a document. Shows the chosen
 * file's name with a way to change or clear it. Works with drag and drop too.
 */
export function FilePick({
  name,
  accept,
  prompt,
  detail,
  onChange,
  autoSubmit = false,
}: {
  name: string;
  accept: string;
  prompt: string;
  detail?: string;
  onChange?: (hasFile: boolean) => void;
  /** Submit the surrounding form as soon as a file is chosen. */
  autoSubmit?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  function picked(files: FileList | null) {
    const f = files?.[0] ?? null;
    setFileName(f?.name ?? null);
    onChange?.(!!f);
    if (f && autoSubmit) input.current?.form?.requestSubmit();
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (input.current && e.dataTransfer.files.length) {
          input.current.files = e.dataTransfer.files;
          picked(e.dataTransfer.files);
        }
      }}
      className={`rounded-[var(--radius-md)] border border-dashed px-4 py-4 transition-colors ${
        over ? "border-forest bg-forest-wash" : fileName ? "border-forest bg-sheet" : "border-control bg-sheet"
      }`}
    >
      <input
        ref={input}
        id={id}
        type="file"
        name={name}
        accept={accept}
        className="sr-only"
        onChange={(e) => picked(e.target.files)}
      />
      {fileName ? (
        <div className="flex items-center gap-3">
          <span aria-hidden className="w-[14px] h-[14px] shrink-0 rounded-full bg-forest grid place-items-center">
            <svg viewBox="0 0 10 10" className="w-2 h-2 text-on-forest" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 5.2 4.2 7.2 8 2.8" />
            </svg>
          </span>
          <span className="truncate text-[15px]">{fileName}</span>
          <label htmlFor={id} className="ml-auto text-sm text-muted underline underline-offset-4 cursor-pointer hover:text-ink">
            Change
          </label>
          <button
            type="button"
            className="text-sm text-muted underline underline-offset-4 hover:text-ink"
            onClick={() => {
              if (input.current) input.current.value = "";
              picked(null);
            }}
          >
            Remove
          </button>
        </div>
      ) : (
        <label htmlFor={id} className="flex items-start gap-4 cursor-pointer">
          <span className="min-w-0">
            <span className="block text-[15px]">{prompt}</span>
            {detail ? <span className="hint block">{detail}</span> : null}
          </span>
          <span className="btn btn-quiet !py-1.5 !px-4 ml-auto shrink-0">Choose file</span>
        </label>
      )}
    </div>
  );
}
