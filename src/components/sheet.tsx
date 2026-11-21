// The boxed section every detail page is built from, and the small pieces that
// go inside it: a titled group of fields, a list of facts, one labelled field.

export function Sheet({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="sheet p-6">
      <div className="flex items-center gap-4 mb-5">
        <h2 className="t-name">{title}</h2>
        {action ? <div className="ml-auto">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-7">
      <legend className="text-sm font-semibold text-muted mb-3">{title}</legend>
      {children}
    </fieldset>
  );
}

export function Facts({ rows, empty = "Nothing yet. Use Edit to add their details." }: { rows: [string, React.ReactNode][]; empty?: string }) {
  const shown = rows.filter(([, v]) => v);
  if (!shown.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <dl className="grid gap-y-3 sm:grid-cols-[8.5rem_1fr] sm:gap-x-4 sm:gap-y-2.5 text-[15px]">
      {shown.map(([k, v]) => (
        // On phones each pair stacks (label above value); from sm up the pair joins the two-column grid.
        <div key={k} className="sm:contents">
          <dt className="text-sm text-muted sm:text-[15px]">{k}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="link">
      {children}
    </a>
  );
}

export function Field({
  name,
  label,
  defaultValue,
  type = "text",
  hint,
  placeholder,
  inputMode,
}: {
  name: string;
  label: string;
  defaultValue: string | number | null;
  type?: string;
  hint?: string;
  placeholder?: string;
  inputMode?: "decimal" | "url" | "text";
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} inputMode={inputMode} className="field" />
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}
