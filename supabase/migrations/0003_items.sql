-- Items: one record per product a firm is specifying, clipped from a vendor
-- page. The same record is meant to feed the proposal, the order tracker and
-- the contractor views later, so nothing is typed twice.

-- A project is only a named list of items (a client or a job). Nothing else
-- hangs off it yet.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

-- What the firm pays this vendor and what it adds on top. Applied to every
-- item bought from the vendor, so the discount is entered once.
alter table public.vendors
  add column trade_discount_pct numeric(5,2) check (trade_discount_pct between 0 and 100),
  add column markup_pct numeric(6,2) check (markup_pct between 0 and 999);

create type public.item_status as enum (
  'clipping',      -- reading the product page
  'ready',         -- read, with a name and a price
  'needs_review',  -- read, but something a person should fill in is missing
  'failed'         -- the page couldn't be read
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  -- Who the firm buys it from. Usually the site it was clipped from, but it can
  -- be a buying group or showroom that sells the maker's line.
  vendor_id uuid references public.vendors(id) on delete set null,
  status public.item_status not null default 'clipping',
  source_url text not null,
  source_domain text not null,
  name text not null default '',
  maker text not null default '',
  sku text,
  description text,
  dimensions text,
  material text,
  finish text,
  color text,
  lead_time text,
  room text,
  quantity numeric(10,2) not null default 1 check (quantity >= 0),
  unit text not null default 'each',
  images text[] not null default '{}',   -- every product photo found on the page
  image_url text,                        -- the one photo the client sees
  currency text not null default 'USD',
  retail_price numeric(12,2),            -- list price shown on the page
  trade_price numeric(12,2),             -- what the firm pays per unit, when known
  discount_pct numeric(5,2),             -- copied from the vendor when the item is clipped
  markup_pct numeric(6,2),
  freight numeric(12,2),                 -- passed through at cost, never marked up
  price_note text,                       -- e.g. "Trade price shows after sign-in"
  clip_error text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_team_idx on public.items(team_id, created_at desc);
create index items_project_idx on public.items(project_id);
create index items_vendor_idx on public.items(vendor_id);

create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;
alter table public.items enable row level security;

create policy projects_rw on public.projects for all
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
create policy items_rw on public.items for all
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
