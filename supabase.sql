-- Run once in Supabase SQL Editor. Each manager can only access their own rows.
create table if not exists public.workers (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  daily_wage numeric(12,2) not null default 0 check (daily_wage >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create table if not exists public.attendance (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  worker_id text not null,
  work_date date not null,
  work_amount numeric(2,1) not null check (work_amount in (0, 0.5, 1, 1.5, 2)),
  daily_wage numeric(12,2) not null check (daily_wage >= 0),
  note text not null default '' check (char_length(note) <= 500),
  updated_at timestamptz not null default now(),
  unique (user_id, worker_id, work_date),
  foreign key (user_id, worker_id) references public.workers(user_id, id) on delete cascade
);

create table if not exists public.payments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  worker_id text not null,
  payment_date date not null,
  amount numeric(12,2) not null check (amount > 0),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  foreign key (user_id, worker_id) references public.workers(user_id, id) on delete cascade
);

create index if not exists attendance_user_date_idx on public.attendance(user_id, work_date);
create index if not exists payments_user_date_idx on public.payments(user_id, payment_date);
alter table public.workers enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Managers manage their workers" on public.workers;
create policy "Managers manage their workers" on public.workers
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Managers manage their attendance" on public.attendance;
create policy "Managers manage their attendance" on public.attendance
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Managers manage their payments" on public.payments;
create policy "Managers manage their payments" on public.payments
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.workers to authenticated;
grant select, insert, update, delete on public.attendance to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
