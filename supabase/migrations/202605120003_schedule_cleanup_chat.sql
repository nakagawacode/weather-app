create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

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
