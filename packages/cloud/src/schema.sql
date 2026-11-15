create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);
create table if not exists runners (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  token_hash text not null unique,
  mode text not null default 'hosted', -- hosted | hybrid | self
  last_seen timestamptz
);
create table if not exists repos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  full_name text not null,
  installation_id bigint,
  unique (org_id, full_name)
);
create table if not exists jobs (
  id bigserial primary key,
  kind text not null,               -- scan | fix
  payload jsonb not null,
  status text not null default 'queued',
  attempts int not null default 0,
  run_after timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists jobs_ready on jobs (status, run_after);
create table if not exists findings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  repo text not null,
  commit text not null,
  detector text not null,
  rule_id text not null,
  file text not null,
  line int not null,
  severity text not null,
  grid_impact boolean not null default false,
  status text not null default 'open',  -- open | fixing | pr_open | fixed | ignored
  pr_url text,
  created_at timestamptz not null default now()
);
create table if not exists audit_log (
  id bigserial primary key,
  org_id uuid,
  actor text not null,
  action text not null,
  detail jsonb,
  at timestamptz not null default now()
);
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  pw_hash text not null,
  org_id uuid not null references orgs(id),
  created_at timestamptz not null default now()
);
create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null
);
alter table orgs add column if not exists sector text not null default 'power';
alter table orgs add column if not exists modules text[] not null default array['grid-ot','secrets-core'];
alter table orgs add column if not exists github_login text;
alter table orgs add column if not exists github_token_enc text;
alter table findings add column if not exists message text;
alter table findings add column if not exists fix text;
alter table findings add column if not exists scan_id uuid;
create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  repo text not null,
  commit text,
  source text not null default 'cloud',
  status text not null default 'queued',
  files int not null default 0,
  findings int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
