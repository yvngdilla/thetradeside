"use client";

import { useEffect, useRef, useState } from "react";

const STYLES = [
  { id: "1", font: "var(--font-sig-1)", size: 64 },
  { id: "2", font: "var(--font-sig-2)", size: 66 },
  { id: "3", font: "var(--font-sig-3)", size: 56 },
];
const INK = "#1c2440";

/**
 * Her signature for certificates. By default it's typed: her printed name set in
 * a signature style she picks, which she adopts with a checkbox. She can draw
 * one or upload an image instead. Writes a transparent PNG data URL into a
 * hidden input named "signature" (empty means "keep the current one").
 */
export function SignaturePad({ existingUrl, name }: { existingUrl: string | null; name: string }) {
  const [mode, setMode] = useState<"view" | "type" | "draw">(existingUrl ? "view" : "type");
  const [style, setStyle] = useState(STYLES[0].id);
  const [drawn, setDrawn] = useState("");
  const [uploaded, setUploaded] = useState("");
  const [typed, setTyped] = useState("");

  // Render the typed signature to a PNG whenever the name or style changes.
  useEffect(() => {
    if (mode !== "type") return;
    let cancelled = false;
    const s = STYLES.find((x) => x.id === style)!;
    const family = getComputedStyle(document.documentElement).getPropertyValue(s.font.slice(4, -1)).trim();
    const text = name.trim();
    if (!text || !family) return;
    document.fonts.load(`${s.size}px ${family}`, text).then(() => {
      if (cancelled) return;
      setTyped(renderText(text, family, s.size));
    });
    return () => {
      cancelled = true;
    };
  }, [mode, style, name]);

  const value = mode === "type" ? (name.trim() ? typed : "") : mode === "draw" ? drawn : uploaded;

  return (
    <div>
      <input type="hidden" name="signature" value={value} />

      {mode === "view" ? (
        <div className="flex flex-wrap items-end gap-4">
          <div className="h-20 w-72 border-b border-ink/60 flex items-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {uploaded || existingUrl ? <img src={uploaded || existingUrl!} alt="Your signature" className="max-h-16" /> : null}
          </div>
          <button type="button" className="btn btn-quiet !py-1.5 !px-4" onClick={() => setMode("type")}>
            Change signature
          </button>
        </div>
      ) : (
        <div>
          <div role="tablist" aria-label="How to sign" className="flex gap-5 text-sm mb-3">
            {(
              [
                ["type", "Type it"],
                ["draw", "Draw it"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`pb-1 border-b-2 ${mode === m ? "border-forest text-ink font-semibold" : "border-transparent text-muted hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
            {existingUrl ? (
              <button type="button" className="ml-auto text-muted hover:text-ink" onClick={() => setMode("view")}>
                Keep current signature
              </button>
            ) : null}
          </div>

          {mode === "type" ? (
            name.trim() ? (
              <div>
                <div role="radiogroup" aria-label="Signature style" className="grid gap-2 sm:grid-cols-3">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={style === s.id}
                      onClick={() => setStyle(s.id)}
                      className={`h-20 px-3 rounded-[var(--radius-md)] border text-left overflow-hidden whitespace-nowrap ${
                        style === s.id ? "border-forest ring-2 ring-forest/20 bg-sheet" : "border-control bg-sheet hover:bg-plaster"
                      }`}
                      style={{ fontFamily: s.font, fontSize: s.size * 0.55, color: INK }}
                    >
                      {name.trim()}
                    </button>
                  ))}
                </div>
                <label className="flex items-start gap-2 mt-3 text-sm">
                  <input type="checkbox" name="adopt_signature" required className="mt-1" />
                  <span>I adopt this as my electronic signature on resale certificates I file through The Trade Side.</span>
                </label>
              </div>
            ) : (
              <p className="text-sm text-muted">Enter your printed name above and your signature appears here.</p>
            )
          ) : (
            <DrawPad onChange={setDrawn} onUpload={(png) => { setUploaded(png); setMode("view"); }} />
          )}
        </div>
      )}
    </div>
  );
}

function renderText(text: string, family: string, size: number): string {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  const scale = 2;
  ctx.font = `${size * scale}px ${family}`;
  const w = Math.ceil(ctx.measureText(text).width) + 40 * scale;
  const h = Math.ceil(size * 1.6 * scale);
  c.width = w;
  c.height = h;
  ctx.font = `${size * scale}px ${family}`;
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, 20 * scale, h * 0.68);
  return trimmedPng(c);
}

function DrawPad({ onChange, onUpload }: { onChange: (png: string) => void; onUpload: (png: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvas.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = INK;
  }, []);

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
    onChange(trimmedPng(canvas.current!));
  };
  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    onChange("");
  };
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    onUpload(c.toDataURL("image/png"));
  };

  return (
    <div>
      <canvas
        ref={canvas}
        className="h-28 w-full max-w-md bg-sheet border border-control rounded-[var(--radius-md)] touch-none cursor-crosshair"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        aria-label="Signature drawing area"
      />
      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted">
        <button type="button" className="hover:text-ink underline underline-offset-4" onClick={clear}>
          Clear
        </button>
        <label className="hover:text-ink underline underline-offset-4 cursor-pointer">
          Upload an image of your signature
          <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={upload} />
        </label>
      </div>
    </div>
  );
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
