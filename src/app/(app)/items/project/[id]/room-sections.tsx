"use client";

import { useState, useTransition } from "react";
import { saveRoomOrder } from "@/app/actions";

interface Room {
  /** The room as typed on the items. Empty for items with no room yet. */
  room: string;
  label: string;
  count: number;
  content: React.ReactNode;
}

/**
 * A project's rooms, one section each, in an order the designer sets by
 * dragging a room's heading or with its Move up and Move down buttons (for
 * keyboards and touch screens). The order is saved as soon as it changes.
 */
export function RoomSections({ projectId, rooms }: { projectId: string; rooms: Room[] }) {
  const [order, setOrder] = useState(() => rooms.map((r) => r.room));
  const [dragging, setDragging] = useState<string | null>(null);
  const [target, setTarget] = useState<{ room: string; after: boolean } | null>(null);
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [, startSaving] = useTransition();

  const sorted = [...rooms].sort((a, b) => order.indexOf(a.room) - order.indexOf(b.room));
  const canMove = rooms.length > 1;

  function save(next: string[]) {
    const before = order;
    if (next.join("\n") === before.join("\n")) return;
    setOrder(next);
    setMessage({});
    startSaving(async () => {
      const result = await saveRoomOrder(projectId, next);
      if (result?.error) {
        setOrder(before);
        setMessage({ error: "Couldn't save the room order. Try again." });
      } else setMessage({ ok: "Room order saved" });
    });
  }

  /** Puts `room` just before or after `beside`. */
  function place(room: string, beside: string, after: boolean) {
    const next = order.filter((r) => r !== room);
    next.splice(next.indexOf(beside) + (after ? 1 : 0), 0, room);
    save(next);
  }

  function step(room: string, by: -1 | 1) {
    const at = order.indexOf(room);
    const beside = order[at + by];
    if (beside !== undefined) place(room, beside, by === 1);
  }

  return (
    <div>
      <p role="status" className={`min-h-5 text-sm print:hidden ${message.error ? "text-alert" : "text-good"}`}>
        {message.error ?? message.ok ?? ""}
      </p>
      <div className="space-y-10">
        {sorted.map((r, at) => {
          const line = target?.room === r.room && dragging !== r.room ? (target.after ? "border-b-accent" : "border-t-accent") : "";
          return (
            <section
              key={r.room}
              aria-label={r.label}
              className={`border-y-2 border-transparent ${line} ${dragging === r.room ? "opacity-50" : ""}`}
              onDragOver={(e) => {
                if (!dragging) return;
                e.preventDefault();
                const box = e.currentTarget.getBoundingClientRect();
                const after = e.clientY > box.top + box.height / 2;
                if (target?.room !== r.room || target.after !== after) setTarget({ room: r.room, after });
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging && target && dragging !== target.room) place(dragging, target.room, target.after);
                setDragging(null);
                setTarget(null);
              }}
            >
              <div
                draggable={canMove}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", r.label);
                  setDragging(r.room);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setTarget(null);
                }}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule pb-3 break-after-avoid ${canMove ? "cursor-grab active:cursor-grabbing" : ""}`}
              >
                {canMove ? (
                  <svg aria-hidden viewBox="0 0 12 18" className="h-[18px] w-3 shrink-0 text-muted print:hidden" fill="currentColor">
                    {[3, 9, 15].flatMap((y) => [2.5, 9.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} />))}
                  </svg>
                ) : null}
                <h2 className="t-name min-w-0">
                  {r.label} <span className="font-sans text-sm text-muted tabular-nums">{r.count}</span>
                </h2>
                {canMove ? (
                  <div className="ml-auto flex gap-1 text-sm print:hidden">
                    <button type="button" disabled={at === 0} onClick={() => step(r.room, -1)} className="rounded-full px-3 py-1.5 whitespace-nowrap text-muted hover:bg-wash hover:text-ink disabled:invisible">
                      Move up<span className="sr-only">: {r.label}</span>
                    </button>
                    <button type="button" disabled={at === sorted.length - 1} onClick={() => step(r.room, 1)} className="rounded-full px-3 py-1.5 whitespace-nowrap text-muted hover:bg-wash hover:text-ink disabled:invisible">
                      Move down<span className="sr-only">: {r.label}</span>
                    </button>
                  </div>
                ) : null}
              </div>
              {r.content}
            </section>
          );
        })}
      </div>
    </div>
  );
}
