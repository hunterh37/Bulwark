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
