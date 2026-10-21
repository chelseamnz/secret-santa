-- =============================================================================
-- Secret Santa — initial database setup
-- Run once in Supabase → SQL Editor. Safe to re-run (everything is idempotent).
--
-- Security model: Row Level Security is ON for every table and there are no
-- policies, so the public (anon) key can read nothing. All reads and writes go
-- through the site's server code with the service-role key, which checks the
-- person's private link first.
--
-- No family data lives in this file. Names are added from the organizer page.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Long random code for each person's private link (128 bits, URL-safe hex).
create or replace function public.new_link_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select encode(extensions.gen_random_bytes(16), 'hex');
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Settings (one row) — edited from the organizer page
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id            smallint primary key default 1 check (id = 1),
  budget_php    integer not null default 1000 check (budget_php >= 0),
  draw_date     date,
  reveal_at     timestamptz,                 -- Dec 24 reveal time
  phase         text not null default 'open'
                check (phase in ('open', 'drawn')),
  drawn_at      timestamptz,
  reveal_order  uuid[],                      -- shuffled once at the draw, same for everyone
  updated_at    timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- People — the family, each with a private link
-- ---------------------------------------------------------------------------
create table if not exists public.people (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique check (length(trim(name)) between 1 and 40),
  sort_order      integer not null default 0,
  link_token      text not null unique default public.new_link_token(),
  link_opened_at  timestamptz,               -- null = "Not opened"
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Boxes — one per person: wrapping, letter, posted state
-- ---------------------------------------------------------------------------
create table if not exists public.boxes (
  person_id   uuid primary key references public.people (id) on delete cascade,
  paper       text not null,                 -- e.g. 'robin-blue'
  bow         text not null,                 -- e.g. 'gold-lace'
  letter      text check (letter is null or length(letter) <= 8000),
  posted_at   timestamptz,                   -- null = still wrapping
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Wishes — store items and "from the heart" picks
-- ---------------------------------------------------------------------------
create table if not exists public.wishes (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.people (id) on delete cascade,
  kind        text not null check (kind in ('store', 'heart')),
  title       text not null check (length(trim(title)) between 1 and 120),
  price_php   integer check (price_php is null or price_php >= 0),
  url         text check (url is null or url ~* '^https?://'),
  note        text check (note is null or length(note) <= 500),
  photo_path  text,                          -- path in the 'wish-photos' storage bucket
  heart_key   text,                          -- preset idea: 'letter', 'drawing', 'treats', ...
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (kind = 'store' or (price_php is null and url is null and photo_path is null))
);

create index if not exists wishes_person_idx on public.wishes (person_id, kind, sort_order);
create unique index if not exists wishes_heart_preset_uniq
  on public.wishes (person_id, heart_key) where heart_key is not null;

-- ---------------------------------------------------------------------------
-- Pairings — written only by run_draw(). santa → giftee.
-- ---------------------------------------------------------------------------
create table if not exists public.pairings (
  santa_id          uuid primary key references public.people (id) on delete restrict,
  giftee_id         uuid not null unique references public.people (id) on delete restrict,
  envelope_opened_at timestamptz,            -- santa broke the seal
  box_opened_at     timestamptz,             -- santa unwrapped giftee's box
  last_seen_at      timestamptz,             -- for the "Updated" tag
  created_at        timestamptz not null default now(),
  check (santa_id <> giftee_id)              -- nobody draws themselves
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

drop trigger if exists people_touch on public.people;
create trigger people_touch before update on public.people
  for each row execute function public.touch_updated_at();

drop trigger if exists boxes_touch on public.boxes;
create trigger boxes_touch before update on public.boxes
  for each row execute function public.touch_updated_at();

drop trigger if exists wishes_touch on public.wishes;
create trigger wishes_touch before update on public.wishes
  for each row execute function public.touch_updated_at();

-- Changing a wish marks the owner's box as updated, so their Santa sees "Updated".
create or replace function public.touch_box_from_wish()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.boxes
     set updated_at = now()
   where person_id = coalesce(new.person_id, old.person_id);
  return null;
end;
$$;

drop trigger if exists wishes_touch_box on public.wishes;
create trigger wishes_touch_box after insert or update or delete on public.wishes
  for each row execute function public.touch_box_from_wish();

-- ---------------------------------------------------------------------------
-- Status view for the organizer page and the tree
-- ---------------------------------------------------------------------------
create or replace view public.people_status
with (security_invoker = true) as
select
  p.id,
  p.name,
  p.sort_order,
  case
    when b.posted_at is not null then 'under_tree'
    when p.link_opened_at is not null then 'wrapping'
    else 'not_opened'
  end as status,
  p.link_opened_at,
  b.posted_at,
  b.updated_at as box_updated_at,
  b.paper,
  b.bow
from public.people p
left join public.boxes b on b.person_id = p.id;

-- ---------------------------------------------------------------------------
-- The draw. One call, all-or-nothing.
--   • Refuses unless everyone's box is posted and the draw hasn't happened.
--   • Shuffles everyone into a single loop (A→B→C→…→A), so nobody can ever
--     draw themselves and nobody is left without a giftee.
--   • Shuffles a separate order for the Dec 24 reveal show.
-- ---------------------------------------------------------------------------
create or replace function public.run_draw()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  ids        uuid[];
  n          integer;
  waiting    integer;
  i          integer;
begin
  -- one draw at a time
  perform 1 from public.settings where id = 1 for update;

  if (select phase from public.settings where id = 1) <> 'open' then
    raise exception 'The draw has already happened.';
  end if;

  select count(*) into n from public.people;
  if n < 3 then
    raise exception 'Need at least 3 people to draw (have %).', n;
  end if;

  select count(*) into waiting
    from public.people p
    left join public.boxes b on b.person_id = p.id
   where b.posted_at is null;
  if waiting = 1 then
    raise exception '1 person is not under the tree yet.';
  elsif waiting > 1 then
    raise exception '% people are not under the tree yet.', waiting;
  end if;

  select array_agg(id order by extensions.gen_random_uuid()) into ids from public.people;

  delete from public.pairings;
  for i in 1..n loop
    insert into public.pairings (santa_id, giftee_id)
    values (ids[i], ids[(i % n) + 1]);
  end loop;

  update public.settings
     set phase        = 'drawn',
         drawn_at     = now(),
         reveal_order = (select array_agg(id order by extensions.gen_random_uuid()) from public.people)
   where id = 1;

  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lock everything down: no access for the public/anon or logged-in roles.
-- The service role (server code only) bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.people   enable row level security;
alter table public.boxes    enable row level security;
alter table public.wishes   enable row level security;
alter table public.pairings enable row level security;

revoke all on public.settings, public.people, public.boxes, public.wishes,
              public.pairings, public.people_status
  from anon, authenticated;

revoke execute on function public.run_draw() from public, anon, authenticated;
grant  execute on function public.run_draw() to service_role;

-- ---------------------------------------------------------------------------
-- Private storage bucket for wish photos (max 5 MB, images only)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wish-photos', 'wish-photos', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;
