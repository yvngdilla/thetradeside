-- The order a project's rooms appear in on client and contractor lists. A room
-- is just the text typed on an item, so the order is a list of those names.
-- Rooms not in the list yet follow in the order they were first used.
alter table public.projects
  add column room_order text[] not null default '{}';
