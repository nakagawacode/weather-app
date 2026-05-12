create table if not exists public.weather_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  subscription jsonb not null,
  room text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.weather_push_subscriptions enable row level security;

drop trigger if exists update_weather_push_subscriptions_updated_at
on public.weather_push_subscriptions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_weather_push_subscriptions_updated_at
before update on public.weather_push_subscriptions
for each row
execute function public.set_updated_at();

drop policy if exists "Anyone can register weather push subscriptions"
on public.weather_push_subscriptions;

create policy "Anyone can register weather push subscriptions"
on public.weather_push_subscriptions
for insert
with check (
  length(endpoint) between 20 and 2048
  and length(room) between 1 and 40
  and jsonb_typeof(subscription) = 'object'
);

drop policy if exists "Anyone can update their weather push subscription"
on public.weather_push_subscriptions;

create policy "Anyone can update their weather push subscription"
on public.weather_push_subscriptions
for update
using (true)
with check (
  length(endpoint) between 20 and 2048
  and length(room) between 1 and 40
  and jsonb_typeof(subscription) = 'object'
);

drop policy if exists "Anyone can read weather push subscriptions for upsert"
on public.weather_push_subscriptions;

create policy "Anyone can read weather push subscriptions for upsert"
on public.weather_push_subscriptions
for select
using (true);

create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Run supabase/schedule_cleanup_chat.sql first, or create these Vault secrets here
-- with your own values:
-- project_url: https://YOUR_PROJECT_REF.supabase.co
-- anon_key: Project Settings > API Keys > anon/public key
-- notification_secret: Any long random string. Use the same value for the
-- Supabase Edge Function NOTIFICATION_SECRET secret.

select cron.unschedule(jobid)
from cron.job
where jobname = 'send-daily-weather-notifications';

select cron.schedule(
  'send-daily-weather-notifications',
  '0 23 * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-daily-weather-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
        'x-notification-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'notification_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);
