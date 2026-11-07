-- ResaleForm initial schema
-- Multi-tenant: every row belongs to a workspace (team). Members see only their workspace.

create extension if not exists pgcrypto;

-- Workspaces -----------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  role text not null default 'member' check (role in ('owner', 'member')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (team_id, email)
);
create index team_members_user_idx on public.team_members(user_id);
create index team_members_email_idx on public.team_members(lower(email));

-- Business details that appear on every certificate (one per workspace).
create table public.business_profiles (
  team_id uuid primary key references public.teams(id) on delete cascade,
  business_name text not null default '',        -- firm name used in emails and the app
  purchaser_name text not null default '',       -- exact "Name of purchaser" line, e.g. "Jane Doe (Doe Design, LLC) / DBA Doe Interiors"
  seller_permit text not null default '',
  business_type text not null default '',
  property_description text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  city text not null default '',
  state text not null default 'CA',
  postal_code text not null default '',
  phone text not null default '',
  website text not null default '',
  email_note text not null default '',
  updated_at timestamptz not null default now()
);

-- Each person who signs certificates.
create table public.signers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  printed_name text not null default '',
  title text not null default '',
  signature_path text,
  updated_at timestamptz not null default now()
);

-- Standard documents a vendor may ask for (seller's permit copy, W-9, business license).
create table public.team_documents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  label text not null,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Vendors ----------------------------------------------------------------------
create type public.vendor_status as enum (
  'researching',   -- crawling the vendor site
  'ready',         -- research done, ready to file
  'needs_review',  -- research unsure, a person should check the details
  'in_progress',   -- a filing is underway (draft created or portal open)
  'filed',         -- certificate sent or submitted
  'failed'         -- research failed
);

create type public.submission_method as enum (
  'email', 'web_form', 'portal_account', 'contact_rep', 'unknown'
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  domain text not null,
  aliases text[] not null default '{}',
  display_name text not null default '',
  seller_name text not null default '',
  status public.vendor_status not null default 'researching',
  method public.submission_method not null default 'unknown',
  trade_email text,
  trade_url text,
  application_url text,
  required_documents text[] not null default '{}',
  property_description text,                     -- paragraph 5 for this vendor; falls back to the workspace default
  discount_info text,
  own_form_url text,
  research_summary text,
  research_confidence text check (research_confidence in ('high', 'medium', 'low')),
  research_sources text[] not null default '{}',
  research_error text,
  account_status text,
  rep_name text,
  rep_email text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  filed_at timestamptz,
  filed_by uuid references auth.users(id) on delete set null,
  unique (team_id, domain)
);
create index vendors_team_idx on public.vendors(team_id, updated_at desc);
create index vendors_aliases_idx on public.vendors using gin(aliases);

-- Each attempt to file a certificate with a vendor.
create type public.filing_status as enum (
  'preparing',        -- building the certificate / starting the browser
  'draft_created',    -- Outlook draft waiting to be sent
  'portal_running',   -- browser assistant filling the vendor form
  'awaiting_review',  -- form filled, waiting for a person to review and submit
  'sent',             -- email went out
  'submitted',        -- portal form submitted
  'manual',           -- marked filed by hand (phone, rep, in person)
  'failed',
  'cancelled'
);

create table public.filings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  form_code text not null default 'CDTFA-230',
  method text not null check (method in ('email', 'portal', 'manual')),
  status public.filing_status not null default 'preparing',
  certificate_path text,
  attached_document_ids uuid[] not null default '{}',
  outlook_message_id text,
  outlook_web_link text,
  sent_to text,
  browser_session_id text,
  live_view_url text,
  steps jsonb not null default '[]',
  open_items jsonb not null default '[]',
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index filings_vendor_idx on public.filings(vendor_id, created_at desc);
create index filings_open_idx on public.filings(status) where status in ('draft_created', 'awaiting_review', 'portal_running');

-- Microsoft 365 connections (tokens encrypted by the app; never readable by clients).
create table public.outlook_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  refresh_token_enc text not null,
  access_token_enc text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- updated_at triggers -----------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger vendors_touch before update on public.vendors
  for each row execute function public.touch_updated_at();
create trigger filings_touch before update on public.filings
  for each row execute function public.touch_updated_at();
create trigger business_profiles_touch before update on public.business_profiles
  for each row execute function public.touch_updated_at();
create trigger signers_touch before update on public.signers
  for each row execute function public.touch_updated_at();

-- Row level security ------------------------------------------------------------
create or replace function public.is_team_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where team_id = t and user_id = auth.uid()
  );
$$;

create or replace function public.is_team_owner(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where team_id = t and user_id = auth.uid() and role = 'owner'
  );
$$;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.business_profiles enable row level security;
alter table public.signers enable row level security;
alter table public.team_documents enable row level security;
alter table public.vendors enable row level security;
alter table public.filings enable row level security;
alter table public.outlook_connections enable row level security;

create policy teams_read on public.teams for select using (public.is_team_member(id));
create policy teams_update on public.teams for update using (public.is_team_owner(id));

create policy members_read on public.team_members for select using (public.is_team_member(team_id));
create policy members_insert on public.team_members for insert with check (public.is_team_owner(team_id));
create policy members_delete on public.team_members for delete using (public.is_team_owner(team_id));

create policy profile_rw on public.business_profiles for all
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

create policy signers_read on public.signers for select using (public.is_team_member(team_id));
create policy signers_write on public.signers for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_team_member(team_id));

create policy docs_rw on public.team_documents for all
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

create policy vendors_rw on public.vendors for all
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

create policy filings_read on public.filings for select using (public.is_team_member(team_id));
-- filings are written by the server with the service role only.

-- outlook_connections: no policies, so only the service role can read or write.

-- Storage -----------------------------------------------------------------------
-- One private bucket. The server reads and writes it with the service role after
-- checking workspace membership. Paths are prefixed with the team id.
insert into storage.buckets (id, name, public) values ('workspace-files', 'workspace-files', false)
  on conflict (id) do nothing;
