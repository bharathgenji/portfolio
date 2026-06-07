-- Adept schema: profiles, topics, flashcards + Row-Level Security.
-- Run once in Supabase → SQL Editor. Idempotent (safe to re-run).

-- ── tables ───────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  slug text not null,
  target_level text,
  assessment jsonb,
  curriculum jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, slug)
);
create index if not exists topics_user_idx on public.topics (user_id);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  topic_id uuid not null references public.topics on delete cascade,
  module_id text,
  front text not null,
  back text not null,
  ease real not null default 2.5,
  interval_days int not null default 0,
  reps int not null default 0,
  due_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists flashcards_user_idx on public.flashcards (user_id);
create index if not exists flashcards_due_idx on public.flashcards (user_id, due_at);

-- ── row-level security: users touch only their own rows ──────────────────────
alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.flashcards enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own topics" on public.topics;
create policy "own topics" on public.topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own flashcards" on public.flashcards;
create policy "own flashcards" on public.flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── auto-create a profile row on signup ──────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
