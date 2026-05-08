select cron.unschedule(jobid)
from cron.job
where jobname = 'delete-old-weather-chat-messages';
