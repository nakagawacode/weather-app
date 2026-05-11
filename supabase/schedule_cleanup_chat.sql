create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Replace these placeholder values before running this file in Supabase SQL Editor.
-- project_url: https://YOUR_PROJECT_REF.supabase.co
-- anon_key: Project Settings > API Keys > anon/public key
-- cleanup_secret: Any long random string. Use the same value for the
-- Supabase Edge Function CLEANUP_SECRET secret.

select vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'project_url'
)
where not exists (
  select 1
  from vault.decrypted_secrets
  where name = 'project_url'
);

select vault.create_secret(
  'YOUR_SUPABASE_ANON_KEY',
  'anon_key'
)
where not exists (
  select 1
  from vault.decrypted_secrets
  where name = 'anon_key'
);

select cron.unschedule(jobid)
from cron.job
where jobname in (
  'delete-old-weather-chat-messages',
  'cleanup-weather-chat-with-images'
);

select cron.schedule(
  'cleanup-weather-chat-with-images',
  '*/30 * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/cleanup-chat',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
        'x-cleanup-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);
