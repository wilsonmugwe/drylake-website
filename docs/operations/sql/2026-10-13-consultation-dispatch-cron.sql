-- Consultation email dispatcher, every minute, from Supabase (pg_cron + pg_net).
--
-- WHY: 24-hour reminders must go out on time. Vercel Hobby refuses any cron more frequent than
-- daily at deploy time, and the Vercel plan is not visible from the repo, so the precise
-- trigger runs inside Supabase instead (works on any Vercel plan). vercel.json keeps a daily
-- Vercel cron as a backstop. Booking routes also dispatch immediately after each change.
--
-- RUN ONCE, in the Supabase SQL editor, AFTER the consultation migration is applied and the
-- app is deployed with CRON_SECRET set. Replace the two placeholders first. Never commit the
-- secret: it lives only in Supabase Vault and in Vercel's CRON_SECRET.
--
-- Prerequisites (Database > Extensions): pg_cron and pg_net enabled.

-- 1. Secrets in Vault (re-runnable: update instead of create if they already exist).
select vault.create_secret('https://drylake.com.au', 'drylake_app_url');
select vault.create_secret('<SAME VALUE AS VERCEL CRON_SECRET>', 'drylake_cron_secret');

-- 2. The job: POST to the dispatcher with the bearer secret, every minute.
select cron.schedule(
  'drylake-consultation-dispatch',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'drylake_app_url')
           || '/api/cron/consultation-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'drylake_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Check it is running (status 200 rows should appear each minute):
--   select jobid, status, return_message, start_time from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'drylake-consultation-dispatch')
--    order by start_time desc limit 10;
--   select status_code, content::text, created from net._http_response order by created desc limit 10;
--
-- Rotate the secret: update Vercel CRON_SECRET, redeploy, then
--   select vault.update_secret((select id from vault.secrets where name = 'drylake_cron_secret'), '<new>');
--
-- Remove the job:
--   select cron.unschedule('drylake-consultation-dispatch');
