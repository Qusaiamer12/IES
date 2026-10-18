-- Spam guard that holds across all serverless instances: per table, at most 3 submissions per email
-- and 60 in total per rolling hour. Runs as the table owner so the insert-only anon role can be counted.
-- The site answers a refused insert with HTTP 429 ("Too many messages in the last hour").
create or replace function public.throttle_form_submissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  per_email int;
  total int;
begin
  execute format(
    'select count(*) filter (where lower(email) = lower($1)), count(*) from %I.%I where created_at > now() - interval ''1 hour''',
    tg_table_schema, tg_table_name)
  into per_email, total
  using new.email;
  if per_email >= 3 or total >= 60 then
    raise exception 'rate limit: too many submissions, try again later' using hint = 'rate_limited';
  end if;
  return new;
end;
$$;

revoke all on function public.throttle_form_submissions() from public, anon, authenticated;

create trigger contact_messages_throttle before insert on public.contact_messages
  for each row execute function public.throttle_form_submissions();
create trigger join_requests_throttle before insert on public.join_requests
  for each row execute function public.throttle_form_submissions();

create index contact_messages_email_idx on public.contact_messages (lower(email), created_at desc);
create index join_requests_email_idx on public.join_requests (lower(email), created_at desc);
