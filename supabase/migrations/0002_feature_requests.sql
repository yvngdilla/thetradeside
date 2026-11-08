-- Feature requests: small tasks designers want Trade Side to take off their plate.
-- Anyone in a workspace can suggest; the workspace sees its own suggestions and
-- their status. Status is changed by Colston (service role or SQL editor).

create table public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  task text not null check (char_length(task) between 1 and 2000),
  current_process text not null default '' check (char_length(current_process) <= 2000),
  may_contact boolean not null default true,
  status text not null default 'new' check (status in ('new', 'planned', 'building', 'shipped', 'not_planned')),
  created_at timestamptz not null default now()
);
create index feature_requests_team_idx on public.feature_requests(team_id, created_at desc);

alter table public.feature_requests enable row level security;

create policy feature_requests_read on public.feature_requests for select
  using (public.is_team_member(team_id));
create policy feature_requests_insert on public.feature_requests for insert
  with check (user_id = auth.uid() and public.is_team_member(team_id));
-- No update or delete policies: only the service role changes status.
