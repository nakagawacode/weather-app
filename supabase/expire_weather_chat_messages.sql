create extension if not exists pg_cron with schema extensions;

delete from public.weather_chat_messages
where created_at < now() - interval '24 hours';

select cron.unschedule(jobid)
from cron.job
where jobname = 'delete-old-weather-chat-messages';

select cron.schedule(
  'delete-old-weather-chat-messages',
  '*/30 * * * *',
  $$
    delete from public.weather_chat_messages
    where created_at < now() - interval '24 hours';
  $$
);
