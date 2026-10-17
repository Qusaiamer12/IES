-- Submissions from the website's contact and join forms.
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 5 and 200 and email like '%_@_%._%'),
  topic text not null check (topic in ('General question', 'Joining the chapter', 'Partnership or sponsorship', 'Event collaboration')),
  message text not null check (char_length(message) between 10 and 3000),
  status text not null default 'new' check (status in ('new', 'replied', 'archived'))
);
comment on table public.contact_messages is 'Messages sent through the website contact form.';

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 5 and 200 and email like '%_@_%._%'),
  phone text check (phone is null or char_length(phone) between 7 and 20),
  major text not null check (char_length(major) between 2 and 100),
  year text not null check (year in ('First year', 'Second year', 'Third year', 'Fourth year', 'Fifth year', 'Graduate')),
  ieee_member text not null check (ieee_member in ('Yes', 'No', 'Not sure')),
  interests text[] not null default '{}' check (cardinality(interests) <= 7),
  message text check (message is null or char_length(message) <= 1500),
  status text not null default 'new' check (status in ('new', 'contacted', 'accepted', 'declined'))
);
comment on table public.join_requests is 'Join requests sent through the website join form.';

create index contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index join_requests_created_at_idx on public.join_requests (created_at desc);

-- Row Level Security: the website may only insert; nobody can read through the public API.
alter table public.contact_messages enable row level security;
alter table public.join_requests enable row level security;

revoke all on public.contact_messages from anon, authenticated;
revoke all on public.join_requests from anon, authenticated;
grant insert on public.contact_messages to anon;
grant insert on public.join_requests to anon;

create policy "website can submit contact messages" on public.contact_messages
  for insert to anon with check (status = 'new');
create policy "website can submit join requests" on public.join_requests
  for insert to anon with check (status = 'new');
