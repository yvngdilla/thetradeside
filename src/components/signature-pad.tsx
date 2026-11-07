"use client";

import { useEffect, useRef, useState } from "react";
import { SIGNATURE_STYLES, type SignatureStyle } from "@/app/fonts/signature";

/** Pen colour for drawn and typed signatures. */
const INK = "#1c2440";

/**
 * Draw a signature with a mouse, finger or stylus, type it in a handwriting
 * style, or upload an image of one. Writes a transparent PNG data URL into a
 * hidden input named "signature".
 */
export function SignaturePad({ existingUrl }: { existingUrl: string | null }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"view" | "draw" | "type">(existingUrl ? "view" : "draw");
  const [typed, setTyped] = useState("");
  const [styleId, setStyleId] = useState(SIGNATURE_STYLES[0].id);

  // Typed signatures are rendered to the same transparent PNG a drawn one makes.
  useEffect(() => {
    if (mode !== "type") return;
    const style = SIGNATURE_STYLES.find((s) => s.id === styleId) ?? SIGNATURE_STYLES[0];
    let cancelled = false;
    renderTyped(typed.trim(), style).then((png) => {
      if (!cancelled) setValue(png);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, typed, styleId]);

  const startTyping = () => {
    if (!typed) {
      const printed = root.current?.closest("form")?.elements.namedItem("printed_name");
      if (printed instanceof HTMLInputElement) setTyped(printed.value.trim());
    }
    setValue("");
    setMode("type");
  };

  const startDrawing = () => {
    setValue("");
    setMode("draw");
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c || mode !== "draw") return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = INK;
  }, [mode]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setValue(trimmedPng(canvas.current!));
  };

  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setValue("");
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const c = document.createElement("canvas");
    const scale = Math.min(1, 600 / img.width);
    c.width = img.width * scale;
    c.height = img.height * scale;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    knockOutWhite(ctx, c.width, c.height);
    setValue(c.toDataURL("image/png"));
    setMode("view");
  };

  const keepCurrent = existingUrl ? (
    <button type="button" className="btn btn-quiet" onClick={() => { setValue(""); setMode("view"); }}>
      Keep current signature
    </button>
  ) : null;
  const uploadButton = (
    <label className="btn btn-quiet has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest">
      Upload an image
      <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={onUpload} />
    </label>
  );

  return (
    <div ref={root}>
      <input type="hidden" name="signature" value={value} />
      {mode === "view" ? (
        <div className="flex items-end gap-4">
          <div className="h-20 w-72 border-b border-ink/60 flex items-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {value || existingUrl ? <img src={value || existingUrl!} alt="Your signature" className="max-h-16" /> : null}
          </div>
          <button type="button" className="btn btn-quiet" onClick={startDrawing}>
            Redraw
          </button>
          <button type="button" className="btn btn-quiet" onClick={startTyping}>
            Type instead
          </button>
        </div>
      ) : mode === "type" ? (
        <div className="max-w-md">
          <label htmlFor="typed_signature" className="label">
            Type your name
          </label>
          <input
            id="typed_signature"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="field"
            autoComplete="name"
            maxLength={60}
          />
          <fieldset className="mt-3 grid gap-2">
            <legend className="sr-only">Signature style</legend>
            {SIGNATURE_STYLES.map((style) => (
              <label
                key={style.id}
                className={`flex items-center gap-3 rounded-md border px-3 h-16 cursor-pointer bg-sheet has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest ${
                  style.id === styleId ? "border-forest" : "border-rule hover:border-control"
                }`}
              >
                <input
                  type="radio"
                  name="signature_style"
                  value={style.id}
                  checked={style.id === styleId}
                  onChange={() => setStyleId(style.id)}
                  className="sr-only"
                />
                <span className={`${style.className} truncate text-ink leading-none`} style={{ fontSize: style.size * 0.45 }}>
                  {typed.trim() || "Your name"}
                </span>
                <span className="ml-auto text-xs text-muted shrink-0">{style.label}</span>
              </label>
            ))}
          </fieldset>
          <p className="hint">This goes on your certificates the same as a signature you draw.</p>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <button type="button" className="btn btn-quiet" onClick={startDrawing}>
              Draw instead
            </button>
            {uploadButton}
            {keepCurrent}
          </div>
        </div>
      ) : (
        <div>
          <canvas
            ref={canvas}
            className="h-28 w-full max-w-md bg-sheet border border-rule rounded-md touch-none cursor-crosshair"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            aria-label="Signature drawing area"
          />
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <button type="button" className="btn btn-quiet" onClick={clear}>
              Clear
            </button>
            <button type="button" className="btn btn-quiet" onClick={startTyping}>
              Type it instead
            </button>
            {uploadButton}
            {keepCurrent}
          </div>
        </div>
      )}
    </div>
  );
}

/** Renders a typed name in a handwriting face as a trimmed, transparent PNG. */
async function renderTyped(name: string, style: SignatureStyle): Promise<string> {
  if (!name) return "";
  const scale = 2;
  const font = `${style.size * scale}px ${style.fontFamily}`;
  try {
    // Load only the handwriting face: asking for the whole stack can reject when a
    // local fallback face isn't installed.
    await document.fonts.load(`${style.size * scale}px ${style.fontFamily.split(",")[0]}`, name);
  } catch {
    // Draw with whatever is available rather than leave the signature empty.
  }
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(name).width);
  // Generous room: script faces swash well past their measured box.
  c.width = width + style.size * scale * 2;
  c.height = Math.ceil(style.size * scale * 2.2);
  ctx.font = font;
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(name, style.size * scale, style.size * scale * 1.4);
  return trimmedPng(c);
}

function trimmedPng(c: HTMLCanvasElement): string {
  const ctx = c.getContext("2d")!;
  const { width, height } = c;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return "";
  const pad = 6;
  const out = document.createElement("canvas");
  out.width = maxX - minX + pad * 2;
  out.height = maxY - minY + pad * 2;
  out.getContext("2d")!.drawImage(c, minX - pad, minY - pad, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

/** Makes a scanned or photographed signature's white paper transparent. */
function knockOutWhite(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    if (lum > 200) d[i + 3] = 0;
  }
  ctx.putImageData(img, 0, 0);
}
