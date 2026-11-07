"use client";

import { useState } from "react";
import { deleteVendor } from "@/app/actions";

/** Remove is quiet and asks once, inline, before doing anything. */
export function RemoveVendor({ vendorId, name }: { vendorId: string; name: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" className="text-sm text-muted hover:text-alert underline-offset-4 hover:underline" onClick={() => setAsking(true)}>
        Remove vendor
      </button>
    );
  }
  return (
    <form action={deleteVendor.bind(null, vendorId)} className="flex flex-wrap items-center gap-3 text-sm">
      <span>Remove {name} and its filing history?</span>
      <button className="btn btn-danger !py-1.5 !px-4">Remove</button>
      <button type="button" className="btn btn-quiet !py-1.5 !px-4" onClick={() => setAsking(false)}>
        Keep
      </button>
    </form>
  );
}
