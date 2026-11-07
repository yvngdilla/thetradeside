import "server-only";
import { SAMPLE_SIGNATURE_BASE64 } from "./sample-signature";
import { seedDemo } from "./seed";

/**
 * Demo mode: the real app running on an in-memory database, so the product can
 * be clicked through without Supabase, email or paid lookups. Never on in
 * production: it needs DEMO_MODE=1 and refuses to run when VERCEL_ENV=production.
 */
export function isDemo(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  // Also on for the "demo" branch's Vercel preview, which is behind Vercel sign-in.
  return process.env.DEMO_MODE === "1" || process.env.VERCEL_GIT_COMMIT_REF === "demo";
}

type Row = Record<string, unknown>;
interface Db {
  tables: Record<string, Row[]>;
  files: Map<string, { bytes: Uint8Array; contentType: string }>;
  sentMail: { to: string; subject: string; at: string }[];
}

const g = globalThis as unknown as { __tradeSideDemo?: Db };

export function demoDb(): Db {
  if (!g.__tradeSideDemo) {
    const db: Db = { tables: {}, files: new Map(), sentMail: [] };
    seedDemo(db.tables, (path, bytes, contentType) => db.files.set(path, { bytes, contentType }), signaturePng());
    g.__tradeSideDemo = db;
  }
  return g.__tradeSideDemo;
}

function signaturePng(): Uint8Array {
  return new Uint8Array(Buffer.from(SAMPLE_SIGNATURE_BASE64, "base64"));
}

export const DEMO_USER = { id: "00000000-0000-4000-8000-000000000001", email: "jane@studiolane.example" };

// Query builder ---------------------------------------------------------------

type Filter = (r: Row) => boolean;
type Result = { data: unknown; error: { message: string; code?: string } | null };

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const DEFAULTS: Record<string, () => Row> = {
  vendors: () => ({
    id: uuid(), aliases: [], display_name: "", seller_name: "", status: "researching", method: "unknown",
    trade_email: null, trade_url: null, application_url: null, required_documents: [], property_description: null,
    discount_info: null, own_form_url: null, research_summary: null, research_confidence: null, research_sources: [],
    research_error: null, account_status: null, rep_name: null, rep_email: null, notes: null, created_at: now(),
    updated_at: now(), filed_at: null, filed_by: null,
  }),
  filings: () => ({
    id: uuid(), form_code: "CDTFA-230", status: "preparing", certificate_path: null, attached_document_ids: [],
    outlook_message_id: null, outlook_web_link: null, sent_to: null, browser_session_id: null, live_view_url: null,
    steps: [], open_items: [], error: null, created_at: now(), updated_at: now(), completed_at: null,
  }),
  team_documents: () => ({ id: uuid(), created_at: now() }),
  team_members: () => ({ role: "member", invited_at: now(), joined_at: null, user_id: null }),
  teams: () => ({ id: uuid(), created_at: now() }),
};

const PRIMARY: Record<string, string[]> = {
  business_profiles: ["team_id"],
  signers: ["user_id"],
  team_members: ["team_id", "email"],
  outlook_connections: ["user_id"],
};

class Query implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private returning = false;
  private selectCols = "*";
  private mode: "many" | "single" | "maybe" = "many";

  constructor(private table: string) {}

  private rows(): Row[] {
    const t = demoDb().tables;
    return (t[this.table] ??= []);
  }

  select(cols = "*") {
    if (this.op === "select") this.selectCols = cols;
    else this.returning = true;
    this.selectCols = cols;
    return this;
  }
  insert(v: Row | Row[]) { this.op = "insert"; this.payload = v; return this; }
  upsert(v: Row | Row[]) { this.op = "upsert"; this.payload = v; return this; }
  update(v: Row) { this.op = "update"; this.payload = v; return this; }
  delete() { this.op = "delete"; return this; }

  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.filters.push((r) => r[c] !== v); return this; }
  is(c: string, v: unknown) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  in(c: string, vs: unknown[]) { this.filters.push((r) => vs.includes(r[c])); return this; }
  gte(c: string, v: string) { this.filters.push((r) => String(r[c]) >= v); return this; }
  ilike(c: string, v: string) {
    const re = new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`, "i");
    this.filters.push((r) => re.test(String(r[c] ?? "")));
    return this;
  }
  /** Supports the one form the app uses: "domain.eq.X,aliases.cs.{X}". */
  or(expr: string) {
    const parts = expr.split(/,(?![^{]*})/).map((p) => p.match(/^(\w+)\.(eq|cs)\.(.*)$/)!).filter(Boolean);
    this.filters.push((r) =>
      parts.some(([, col, op, val]) =>
        op === "eq" ? r[col] === val : Array.isArray(r[col]) && (r[col] as unknown[]).includes(val.replace(/[{}]/g, "")),
      ),
    );
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) { this.orderBy = { col, asc: opts?.ascending ?? true }; return this; }
  limit(n: number) { this.limitN = n; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }

  private matches() {
    return this.rows().filter((r) => this.filters.every((f) => f(r)));
  }

  private shape(rows: Row[]): Row[] {
    // Joins the app uses: team_members -> teams(name), filings -> vendors(display_name, domain)
    return rows.map((r) => {
      const out: Row = { ...r };
      if (this.selectCols.includes("teams(")) {
        const t = demoDb().tables.teams?.find((x) => x.id === r.team_id);
        out.teams = t ? { name: t.name } : null;
      }
      if (this.selectCols.includes("vendors(")) {
        const v = demoDb().tables.vendors?.find((x) => x.id === r.vendor_id);
        out.vendors = v ? { display_name: v.display_name, domain: v.domain } : null;
      }
      return out;
    });
  }

  private run(): Result {
    const table = this.rows();
    let out: Row[] = [];
    switch (this.op) {
      case "select": {
        out = this.matches();
        if (this.orderBy) {
          const { col, asc } = this.orderBy;
          out = [...out].sort((a, b) => (String(a[col] ?? "") < String(b[col] ?? "") ? -1 : 1) * (asc ? 1 : -1));
        }
        if (this.limitN != null) out = out.slice(0, this.limitN);
        break;
      }
      case "insert": {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload!];
        for (const item of items) {
          const keys = PRIMARY[this.table];
          if (keys && table.some((r) => keys.every((k) => r[k] === item[k]))) {
            return { data: null, error: { message: "duplicate key", code: "23505" } };
          }
          if (this.table === "vendors" && table.some((r) => r.team_id === item.team_id && r.domain === item.domain)) {
            return { data: null, error: { message: "duplicate key", code: "23505" } };
          }
          const row = { ...(DEFAULTS[this.table]?.() ?? {}), ...item };
          table.push(row);
          out.push(row);
        }
        break;
      }
      case "upsert": {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload!];
        const keys = PRIMARY[this.table] ?? ["id"];
        for (const item of items) {
          const existing = table.find((r) => keys.every((k) => r[k] === item[k]));
          if (existing) Object.assign(existing, item, { updated_at: now() });
          else table.push({ ...(DEFAULTS[this.table]?.() ?? {}), ...item });
          out.push(existing ?? table[table.length - 1]);
        }
        break;
      }
      case "update": {
        out = this.matches();
        for (const r of out) Object.assign(r, this.payload, { updated_at: now() });
        break;
      }
      case "delete": {
        out = this.matches();
        demoDb().tables[this.table] = table.filter((r) => !out.includes(r));
        break;
      }
    }
    const shaped = this.shape(out);
    if (this.mode === "single") {
      return shaped.length === 1 ? { data: shaped[0], error: null } : { data: null, error: { message: "not found", code: "PGRST116" } };
    }
    if (this.mode === "maybe") return { data: shaped[0] ?? null, error: null };
    if (this.op !== "select" && !this.returning) return { data: null, error: null };
    return { data: shaped, error: null };
  }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, fail?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve().then(() => this.run()).then(ok, fail);
  }
}

/** A stand-in for the parts of the Supabase client this app uses. */
export function demoClient() {
  const user = { id: DEMO_USER.id, email: DEMO_USER.email };
  return {
    from: (table: string) => new Query(table),
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      signOut: async () => ({ error: null }),
      verifyOtp: async () => ({ data: { user }, error: null }),
      exchangeCodeForSession: async () => ({ data: {}, error: null }),
      signInWithOtp: async () => ({ data: {}, error: null }),
      admin: {
        getUserById: async () => ({ data: { user }, error: null }),
        generateLink: async () => ({ data: { properties: { hashed_token: "demo" } }, error: null }),
      },
    },
    storage: {
      from: () => ({
        upload: async (path: string, bytes: Uint8Array, opts?: { contentType?: string }) => {
          demoDb().files.set(path, { bytes, contentType: opts?.contentType ?? "application/octet-stream" });
          return { data: { path }, error: null };
        },
        download: async (path: string) => {
          const f = demoDb().files.get(path);
          return f ? { data: new Blob([Buffer.from(f.bytes)], { type: f.contentType }), error: null } : { data: null, error: { message: "not found" } };
        },
        remove: async (list: string[]) => {
          for (const p of list) demoDb().files.delete(p);
          return { data: [], error: null };
        },
        createSignedUrl: async (path: string) => {
          const f = demoDb().files.get(path);
          return { data: f ? { signedUrl: `data:${f.contentType};base64,${Buffer.from(f.bytes).toString("base64")}` } : null, error: null };
        },
      }),
    },
  };
}
