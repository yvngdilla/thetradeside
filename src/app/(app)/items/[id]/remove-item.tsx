"use client";

import { useState } from "react";
import { deleteItem } from "@/app/actions";

/** Remove is quiet and asks once, inline, before doing anything. */
export function RemoveItem({ itemId, name }: { itemId: string; name: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" className="text-sm text-muted hover:text-alert underline-offset-4 hover:underline" onClick={() => setAsking(true)}>
        Remove item
      </button>
    );
  }
  return (
    <form action={deleteItem.bind(null, itemId)} className="flex flex-wrap items-center gap-3 text-sm text-ink">
      <span>Remove {name}?</span>
      <button className="btn btn-danger !py-1.5 !px-4">Remove</button>
      <button type="button" className="btn btn-quiet !py-1.5 !px-4" onClick={() => setAsking(false)}>
        Keep
      </button>
    </form>
  );
}
