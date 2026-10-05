-- Tracko schema — additive only. Safe to run as many times as you like.
-- Creates anything missing and adds any missing column. It never drops,
-- truncates, deletes or retypes anything, so existing records are untouched.
-- Re-running only fills the gaps left by an older version of this file.

create table if not exists public.workers (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null default '',
  address text not null default '',
  alt_phone text not null default '',
  aadhaar_number text not null default '',
  daily_wage numeric(12,2) not null default 0 check (daily_wage >= 0),
  created_at timestamptz not null default now(),
  unique (user_id,id)
);

create table if not exists public.attendance (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  worker_id text not null,
  work_date date not null,
  work_amount numeric(2,1) not null check (work_amount in (0,0.5,1,1.5,2)),
  daily_wage numeric(12,2) not null check (daily_wage >= 0),
  note text not null default '' check (char_length(note)<=500),
  updated_at timestamptz not null default now(),
  unique (user_id,worker_id,work_date),
  foreign key (user_id,worker_id) references public.workers(user_id,id) on delete cascade
);

create table if not exists public.payments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  worker_id text not null,
  payment_date date not null,
  amount numeric(12,2) not null check (amount>0),
  note text not null default '' check (char_length(note)<=200),
  created_at timestamptz not null default now(),
  foreign key (user_id,worker_id) references public.workers(user_id,id) on delete cascade
);

create table if not exists public.business_days (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,
  sales numeric(12,2) not null default 0 check (sales>=0),
  expenses numeric(12,2) not null default 0 check (expenses>=0),
  note text not null default '' check (char_length(note)<=200),
  updated_at timestamptz not null default now(),
  unique (user_id,work_date)
);

create table if not exists public.business_transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,
  kind text not null check (kind in ('sale','expense')),
  amount numeric(12,2) not null check (amount>0),
  note text not null default '' check (char_length(note)<=200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  business text not null default 'Shree Furniture House',
  address text not null default '',
  email text not null default ''
);

-- Missing columns on an older database. Every default is constant, so existing
-- rows keep their data and simply receive the default for the new column.
alter table public.workers add column if not exists phone text not null default '';
alter table public.workers add column if not exists address text not null default '';
alter table public.workers add column if not exists alt_phone text not null default '';
alter table public.workers add column if not exists aadhaar_number text not null default '';
alter table public.workers add column if not exists name text not null default '';
alter table public.workers add column if not exists daily_wage numeric(12,2) not null default 0;
alter table public.workers add column if not exists created_at timestamptz not null default now();

alter table public.attendance add column if not exists user_id uuid;
alter table public.attendance add column if not exists worker_id text not null default '';
alter table public.attendance add column if not exists work_date date not null default current_date;
alter table public.attendance add column if not exists work_amount numeric(2,1) not null default 0;
alter table public.attendance add column if not exists daily_wage numeric(12,2) not null default 0;
alter table public.attendance add column if not exists note text not null default '';
alter table public.attendance add column if not exists updated_at timestamptz not null default now();

alter table public.payments add column if not exists user_id uuid;
alter table public.payments add column if not exists worker_id text not null default '';
alter table public.payments add column if not exists payment_date date not null default current_date;
alter table public.payments add column if not exists amount numeric(12,2) not null default 0;
alter table public.payments add column if not exists note text not null default '';
alter table public.payments add column if not exists created_at timestamptz not null default now();

alter table public.business_days add column if not exists user_id uuid;
alter table public.business_days add column if not exists work_date date not null default current_date;
alter table public.business_days add column if not exists sales numeric(12,2) not null default 0;
alter table public.business_days add column if not exists expenses numeric(12,2) not null default 0;
alter table public.business_days add column if not exists note text not null default '';
alter table public.business_days add column if not exists updated_at timestamptz not null default now();

alter table public.business_transactions add column if not exists user_id uuid;
alter table public.business_transactions add column if not exists work_date date not null default current_date;
alter table public.business_transactions add column if not exists kind text not null default 'sale';
alter table public.business_transactions add column if not exists amount numeric(12,2) not null default 0;
alter table public.business_transactions add column if not exists note text not null default '';
alter table public.business_transactions add column if not exists created_at timestamptz not null default now();
alter table public.business_transactions add column if not exists updated_at timestamptz not null default now();

alter table public.orders add column if not exists user_id uuid;
alter table public.orders add column if not exists order_data jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists updated_at timestamptz not null default now();

alter table public.admin_profiles add column if not exists name text not null default '';
alter table public.admin_profiles add column if not exists phone text not null default '';
alter table public.admin_profiles add column if not exists business text not null default 'Shree Furniture House';
alter table public.admin_profiles add column if not exists address text not null default '';
alter table public.admin_profiles add column if not exists email text not null default '';
alter table public.admin_profiles add column if not exists whatsapp text not null default '';
alter table public.admin_profiles add column if not exists gstin text not null default '';
alter table public.admin_profiles add column if not exists invoice_prefix text not null default 'INV';
alter table public.admin_profiles add column if not exists invoice_terms text not null default '';
alter table public.admin_profiles add column if not exists gst_enabled boolean not null default false;
alter table public.admin_profiles add column if not exists gst_rate numeric(5,2) not null default 0;
alter table public.admin_profiles add column if not exists gst_type text not null default 'split';
alter table public.admin_profiles add column if not exists logo text not null default '';

-- worker rows must stay unique per owner before attendance and payments can
-- reference them. These are wrapped so that unexpected duplicate rows in an old
-- database only skip one index instead of stopping the rest of the script.
do $$ begin
  create unique index if not exists workers_owner_id on public.workers(user_id,id);
exception when others then raise notice 'Skipped workers_owner_id: %', sqlerrm; end $$;
do $$ begin
  create unique index if not exists attendance_owner_worker_date on public.attendance(user_id,worker_id,work_date);
exception when others then raise notice 'Skipped attendance_owner_worker_date: %', sqlerrm; end $$;
do $$ begin
  create unique index if not exists business_days_owner_date on public.business_days(user_id,work_date);
exception when others then raise notice 'Skipped business_days_owner_date: %', sqlerrm; end $$;

create index if not exists attendance_owner_date on public.attendance(user_id,work_date);
create index if not exists payments_owner_date on public.payments(user_id,payment_date);
create index if not exists business_transactions_owner_date on public.business_transactions(user_id,work_date);
create index if not exists orders_owner on public.orders(user_id);

-- Point attendance and payments at their worker without rechecking rows that
-- already exist, so this never fails on older data.
do $$
declare worker_fks integer;
begin
  select count(*) into worker_fks from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  join pg_class r on r.oid = c.confrelid
  where c.contype = 'f' and n.nspname = 'public' and r.relname = 'workers'
    and t.relname in ('attendance','payments');
  if worker_fks = 0 then
    alter table public.attendance add constraint attendance_worker_fk foreign key (user_id,worker_id) references public.workers(user_id,id) on delete cascade not valid;
    alter table public.payments add constraint payments_worker_fk foreign key (user_id,worker_id) references public.workers(user_id,id) on delete cascade not valid;
  end if;
end $$;

alter table public.workers enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.business_days enable row level security;
alter table public.business_transactions enable row level security;
alter table public.orders enable row level security;
alter table public.admin_profiles enable row level security;

drop policy if exists "Managers manage their workers" on public.workers;
create policy "Managers manage their workers" on public.workers for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists "Managers manage their attendance" on public.attendance;
create policy "Managers manage their attendance" on public.attendance for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists "Managers manage their payments" on public.payments;
create policy "Managers manage their payments" on public.payments for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists "Managers manage their business days" on public.business_days;
create policy "Managers manage their business days" on public.business_days for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists "Managers manage their business transactions" on public.business_transactions;
create policy "Managers manage their business transactions" on public.business_transactions for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists "Managers manage their orders" on public.orders;
create policy "Managers manage their orders" on public.orders for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists "Managers manage their admin profile" on public.admin_profiles;
create policy "Managers manage their admin profile" on public.admin_profiles for all to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

grant usage on schema public to authenticated;
grant select,insert,update,delete on public.workers,public.attendance,public.payments,public.business_days,public.business_transactions,public.orders,public.admin_profiles to authenticated;

-- Read-only report. Every table should now show the expected column count.
select table_name, count(*) as columns_present from information_schema.columns
where table_schema = 'public' and table_name in
  ('workers','attendance','payments','business_days','business_transactions','orders','admin_profiles')
group by table_name order by table_name;