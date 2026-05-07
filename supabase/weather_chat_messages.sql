create table if not exists public.weather_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null,
  kind text not null default 'message',
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.weather_chat_messages enable row level security;

create policy "Anyone can read weather chat messages"
on public.weather_chat_messages
for select
using (true);

create policy "Anyone can post weather chat messages"
on public.weather_chat_messages
for insert
with check (
  kind in ('message', 'reaction')
  and length(body) between 1 and 240
  and length(room) between 1 and 40
);

alter publication supabase_realtime
add table public.weather_chat_messages;
