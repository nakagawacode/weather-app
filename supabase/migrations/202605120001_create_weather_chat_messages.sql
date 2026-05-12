create table if not exists public.weather_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null,
  kind text not null default 'message',
  body text not null,
  image_path text,
  created_at timestamptz not null default now()
);

alter table public.weather_chat_messages
add column if not exists image_path text;

alter table public.weather_chat_messages enable row level security;

drop policy if exists "Anyone can read weather chat messages"
on public.weather_chat_messages;

create policy "Anyone can read weather chat messages"
on public.weather_chat_messages
for select
using (true);

drop policy if exists "Anyone can post weather chat messages"
on public.weather_chat_messages;

create policy "Anyone can post weather chat messages"
on public.weather_chat_messages
for insert
with check (
  kind in ('message', 'reaction', 'image')
  and length(body) between 1 and 240
  and length(room) between 1 and 40
  and (
    kind <> 'image'
    or image_path is not null
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'weather_chat_messages'
  ) then
    alter publication supabase_realtime
    add table public.weather_chat_messages;
  end if;
end;
$$;
