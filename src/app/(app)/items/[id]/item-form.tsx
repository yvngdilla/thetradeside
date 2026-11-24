"use client";

import { useActionState, useState } from "react";
import { updateItem, type ActionState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import { Facts, Field, Group, Sheet } from "@/components/sheet";
import { ItemPhoto } from "@/components/item-photo";
import { UNITS, quantityLabel } from "@/lib/items";
import type { Item } from "@/lib/types";

/**
 * Everything read from the product page in one box. Reads as a short list of
 * facts; Edit turns the same box into a form. Opens in edit mode when the
 * page left something out.
 */
export function ItemForm({
  item,
  projectName,
  projects,
  vendors,
  startEditing,
}: {
  item: Item;
  projectName: string;
  projects: string[];
  vendors: { id: string; name: string }[];
  startEditing: boolean;
}) {
  const [editing, setEditing] = useState(startEditing);
  const [state, action] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await updateItem(prev, fd);
    if (result?.ok) setEditing(false);
    return result;
  }, undefined);

  if (!editing) {
    return (
      <Sheet
        title="Details"
        action={
          <button type="button" className="btn btn-quiet !py-1.5 !px-4" onClick={() => setEditing(true)}>
            Edit
          </button>
        }
      >
        <div className="flex flex-col sm:flex-row gap-6">
          <ItemPhoto src={item.image_url} alt={item.name} className="h-40 w-40 shrink-0" />
          <div className="min-w-0 grow">
            <Facts
              rows={[
                ["Maker", item.maker],
                ["SKU", item.sku],
                ["Dimensions", item.dimensions],
                ["Material", item.material],
                ["Finish", item.finish],
                ["Color", item.color],
                ["Lead time", item.lead_time],
                ["Project", projectName],
                ["Room", item.room],
                ["Quantity", quantityLabel(item.quantity, item.unit)],
              ]}
            />
          </div>
        </div>
        {item.description ? <p className="mt-5 max-w-prose">{item.description}</p> : null}
        {item.notes ? <p className="mt-3 max-w-prose text-sm text-muted">{item.notes}</p> : null}
      </Sheet>
    );
  }

  return (
    <Sheet title="Details">
      <form action={action}>
        <input type="hidden" name="id" value={item.id} />

        <Group title="What it is">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Name" defaultValue={item.name} />
            <Field name="maker" label="Maker" defaultValue={item.maker} />
            <Field name="sku" label="SKU or item number" defaultValue={item.sku} />
            <Field name="lead_time" label="Lead time" defaultValue={item.lead_time} placeholder="6 to 8 weeks" />
          </div>
          <div className="mt-4">
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea id="description" name="description" rows={3} defaultValue={item.description ?? ""} className="field" />
          </div>
        </Group>

        <Group title="Specs">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="dimensions" label="Dimensions" defaultValue={item.dimensions} placeholder={'96" W x 38" D x 32" H'} />
            <Field name="material" label="Material" defaultValue={item.material} />
            <Field name="finish" label="Finish" defaultValue={item.finish} />
            <Field name="color" label="Color" defaultValue={item.color} />
          </div>
        </Group>

        <Group title="Where it goes">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="project" className="label">
                Project
              </label>
              <input id="project" name="project" list="item-project-names" autoComplete="off" defaultValue={projectName} placeholder="Client or job name" className="field" />
              <datalist id="item-project-names">
                {projects.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <Field name="room" label="Room" defaultValue={item.room} placeholder="Primary bedroom" />
            <Field name="quantity" label="Quantity" inputMode="decimal" defaultValue={item.quantity} />
            <div>
              <label htmlFor="unit" className="label">
                Sold by
              </label>
              <select id="unit" name="unit" defaultValue={item.unit} className="field">
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Group>

        <Group title="Price">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="vendor_id" className="label">
                Buying from
              </label>
              <select id="vendor_id" name="vendor_id" defaultValue={item.vendor_id ?? ""} className="field">
                <option value="">{item.source_domain} (not in your vendor list)</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <p className="hint">Pick a buying group or showroom here when you don&rsquo;t buy direct. Their discount and markup come with them.</p>
            </div>
            <Field name="retail_price" label="Retail price" inputMode="decimal" defaultValue={item.retail_price} hint="List price for one, as the vendor shows it." />
            <Field
              name="trade_price"
              label="Your trade price"
              inputMode="decimal"
              defaultValue={item.trade_price}
              hint="What you pay for one. Leave empty to use retail less your discount."
            />
            <Field name="discount_pct" label="Discount, %" inputMode="decimal" defaultValue={item.discount_pct} />
            <Field name="markup_pct" label="Markup, %" inputMode="decimal" defaultValue={item.markup_pct} />
            <Field name="freight" label="Freight" inputMode="decimal" defaultValue={item.freight} hint="Passed to the client at cost, never marked up." />
          </div>
        </Group>

        {item.images.length ? (
          <Group title="Photo the client sees">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {item.images.map((src, n) => (
                <label key={src} className="block cursor-pointer">
                  <input type="radio" name="image_url" value={src} defaultChecked={src === item.image_url} className="peer sr-only" />
                  <ItemPhoto
                    src={src}
                    alt={`Photo ${n + 1}`}
                    className="aspect-square w-full peer-checked:outline peer-checked:outline-2 peer-checked:outline-ink peer-checked:outline-offset-2 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
                  />
                </label>
              ))}
            </div>
          </Group>
        ) : null}

        <div>
          <label htmlFor="notes" className="label">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={2} defaultValue={item.notes ?? ""} placeholder="Only your team sees these." className="field" />
        </div>

        <div className="flex flex-wrap gap-2 pt-5">
          <SubmitButton pending="Saving…">Save changes</SubmitButton>
          {item.status === "ready" ? (
            <button type="button" className="btn btn-quiet" onClick={() => setEditing(false)}>
              Cancel
            </button>
          ) : null}
        </div>
        <FormMessage state={state?.error ? state : undefined} />
      </form>
    </Sheet>
  );
}
