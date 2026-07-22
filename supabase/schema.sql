-- Supabase Migration: Fake Artist Game Schema
create extension if not exists "uuid-ossp";

-- Rooms Table
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'lobby' check (status in ('lobby', 'drawing', 'voting', 'fake_guess', 'results')),
  category text,
  secret_word text,
  fake_player_id uuid,
  current_turn_user_id uuid,
  turn_order jsonb default '[]'::jsonb,
  turn_index integer default 0,
  current_round integer default 1,
  max_rounds integer default 2,
  timer_ends_at timestamptz,
  winner text check (winner in ('artists', 'fake', null)),
  recap_image_url text,
  created_at timestamptz default now()
);

-- Room Players Table (user_id is UUID for guest/auth session)
create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid not null,
  nickname text not null,
  avatar_color text default '#ff007f',
  score integer default 0,
  is_host boolean default false,
  is_ready boolean default false,
  joined_at timestamptz default now(),
  unique(room_id, user_id)
);

-- Votes Table
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  voter_id uuid not null,
  suspect_id uuid not null,
  created_at timestamptz default now(),
  unique(room_id, voter_id)
);

-- RLS Policies
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.votes enable row level security;

create policy "Allow all rooms" on public.rooms for all using (true) with check (true);
create policy "Allow all room_players" on public.room_players for all using (true) with check (true);
create policy "Allow all votes" on public.votes for all using (true) with check (true);

-- Realtime Setup
alter table public.rooms replica identity full;
alter table public.room_players replica identity full;
