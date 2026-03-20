-- ZimRoots Alpha v0 — Database Schema
-- Run this in the Supabase SQL Editor to set up the database

-- Enable pgvector extension for semantic search
create extension if not exists vector;

-- ============================================
-- USERS
-- ============================================
create table users (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,         -- E.164 format: +2637XXXXXXXX
  name text,
  verified boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- BUSINESSES
-- ============================================
create table businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  category text,
  location text,                      -- Suburb or address in Harare
  hours text,                         -- Human-readable: "Mon-Fri 8am-5pm"
  contact text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ============================================
-- PRODUCTS
-- ============================================
create table products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  name text not null,
  description text,
  category text,
  price_range text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ============================================
-- SERVICES
-- ============================================
create table services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  name text not null,
  description text,
  category text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ============================================
-- EVENTS
-- ============================================
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  name text not null,
  description text,
  category text,
  event_date timestamptz,
  event_location text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ============================================
-- JOBS
-- ============================================
create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  title text not null,
  description text,
  category text,
  job_type text,                      -- full-time / part-time / contract / casual
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ============================================
-- SESSIONS (conversation state per phone)
-- ============================================
create table sessions (
  phone text primary key,
  user_id uuid references users(id) on delete set null,
  state text default 'IDLE',          -- Current flow stage
  buffer jsonb default '{}',          -- Partial data collected in current flow
  history jsonb default '[]',         -- Recent message history for Claude context
  updated_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Vector similarity search indexes (IVFFlat for performance)
-- Note: these require at least some rows to exist before creation.
-- For alpha with small data, exact search (no index) is fine.
-- Uncomment when you have 100+ rows per table:
--
-- create index on businesses using ivfflat (embedding vector_cosine_ops) with (lists = 10);
-- create index on products using ivfflat (embedding vector_cosine_ops) with (lists = 10);
-- create index on services using ivfflat (embedding vector_cosine_ops) with (lists = 10);
-- create index on events using ivfflat (embedding vector_cosine_ops) with (lists = 10);
-- create index on jobs using ivfflat (embedding vector_cosine_ops) with (lists = 10);

-- Lookup indexes
create index on businesses(user_id);
create index on products(user_id);
create index on products(business_id);
create index on services(user_id);
create index on services(business_id);
create index on events(user_id);
create index on events(business_id);
create index on jobs(user_id);
create index on jobs(business_id);

-- ============================================
-- VECTOR SEARCH FUNCTIONS
-- ============================================

-- Generic similarity search function
-- Usage: select * from search_entities('products', query_embedding, 5);
create or replace function search_entities(
  target_table text,
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  name text,
  description text,
  category text,
  similarity float
)
language plpgsql
as $$
begin
  return query execute format(
    'select id, name, description, category,
            1 - (embedding <=> $1) as similarity
     from %I
     where embedding is not null
     order by embedding <=> $1
     limit $2',
    target_table
  ) using query_embedding, match_count;
end;
$$;

-- Search across all entity tables at once
create or replace function search_all_entities(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  entity_type text,
  id uuid,
  name text,
  description text,
  category text,
  similarity float
)
language plpgsql
as $$
begin
  return query
    (select 'business'::text, b.id, b.name, b.description, b.category,
            1 - (b.embedding <=> query_embedding) as similarity
     from businesses b where b.embedding is not null)
    union all
    (select 'product'::text, p.id, p.name, p.description, p.category,
            1 - (p.embedding <=> query_embedding) as similarity
     from products p where p.embedding is not null)
    union all
    (select 'service'::text, s.id, s.name, s.description, s.category,
            1 - (s.embedding <=> query_embedding) as similarity
     from services s where s.embedding is not null)
    union all
    (select 'event'::text, e.id, e.name, e.description, e.category,
            1 - (e.embedding <=> query_embedding) as similarity
     from events e where e.embedding is not null)
    union all
    (select 'job'::text, j.id, j.title as name, j.description, j.category,
            1 - (j.embedding <=> query_embedding) as similarity
     from jobs j where j.embedding is not null)
    order by similarity desc
    limit match_count;
end;
$$;

-- ============================================
-- ROW LEVEL SECURITY (basic policies)
-- ============================================

-- Enable RLS on all tables
alter table users enable row level security;
alter table businesses enable row level security;
alter table products enable row level security;
alter table services enable row level security;
alter table events enable row level security;
alter table jobs enable row level security;
alter table sessions enable row level security;

-- Service role can do everything (our server uses service key)
-- These policies allow full access for the service_role
create policy "Service role full access" on users for all using (true) with check (true);
create policy "Service role full access" on businesses for all using (true) with check (true);
create policy "Service role full access" on products for all using (true) with check (true);
create policy "Service role full access" on services for all using (true) with check (true);
create policy "Service role full access" on events for all using (true) with check (true);
create policy "Service role full access" on jobs for all using (true) with check (true);
create policy "Service role full access" on sessions for all using (true) with check (true);
