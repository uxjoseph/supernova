-- Supernova Database Schema
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- ===========================================
-- 1. PROFILES TABLE (extends auth.users)
-- ===========================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  avatar_url text,
  plan_type text default 'free' check (plan_type in ('free', 'pro_monthly', 'pro_annual')),
  credits_remaining integer default 100,
  credits_max integer default 300,
  credits_reset_at timestamp with time zone default (now() + interval '1 day'),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can only view/update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===========================================
-- 2. PROJECTS TABLE
-- ===========================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text default 'Untitled Project',
  thumbnail_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.projects enable row level security;

-- Users can only access their own projects
create policy "Users can view own projects" on public.projects
  for select using (auth.uid() = user_id);

create policy "Users can create projects" on public.projects
  for insert with check (auth.uid() = user_id);

create policy "Users can update own projects" on public.projects
  for update using (auth.uid() = user_id);

create policy "Users can delete own projects" on public.projects
  for delete using (auth.uid() = user_id);

-- ===========================================
-- 3. CANVAS NODES TABLE
-- ===========================================
create table if not exists public.canvas_nodes (
  id text primary key,  -- Client-generated ID (e.g., node-123456)
  project_id uuid references public.projects(id) on delete cascade not null,
  type text not null check (type in ('component', 'image', 'note')),
  title text,
  html text,
  image_url text,
  content text,
  color text,
  x float not null default 0,
  y float not null default 0,
  width float not null default 1440,
  height float not null default 900,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.canvas_nodes enable row level security;

-- Users can only access nodes in their own projects
create policy "Users can view own canvas nodes" on public.canvas_nodes
  for select using (
    exists (
      select 1 from public.projects 
      where projects.id = canvas_nodes.project_id 
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can create canvas nodes" on public.canvas_nodes
  for insert with check (
    exists (
      select 1 from public.projects 
      where projects.id = canvas_nodes.project_id 
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update own canvas nodes" on public.canvas_nodes
  for update using (
    exists (
      select 1 from public.projects 
      where projects.id = canvas_nodes.project_id 
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete own canvas nodes" on public.canvas_nodes
  for delete using (
    exists (
      select 1 from public.projects 
      where projects.id = canvas_nodes.project_id 
      and projects.user_id = auth.uid()
    )
  );

-- ===========================================
-- 4. CHAT MESSAGES TABLE
-- ===========================================
create table if not exists public.chat_messages (
  id text primary key,  -- Client-generated ID
  project_id uuid references public.projects(id) on delete cascade not null,
  role text not null check (role in ('user', 'model')),
  content text,
  image_url text,
  image_urls text[],
  component_title text,
  is_thinking boolean default false,
  generation_sections jsonb,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.chat_messages enable row level security;

-- Users can only access messages in their own projects
create policy "Users can view own chat messages" on public.chat_messages
  for select using (
    exists (
      select 1 from public.projects 
      where projects.id = chat_messages.project_id 
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can create chat messages" on public.chat_messages
  for insert with check (
    exists (
      select 1 from public.projects 
      where projects.id = chat_messages.project_id 
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update own chat messages" on public.chat_messages
  for update using (
    exists (
      select 1 from public.projects 
      where projects.id = chat_messages.project_id 
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete own chat messages" on public.chat_messages
  for delete using (
    exists (
      select 1 from public.projects 
      where projects.id = chat_messages.project_id 
      and projects.user_id = auth.uid()
    )
  );

-- Index for performance
create index if not exists idx_chat_messages_project_id on public.chat_messages(project_id);

-- ===========================================
-- 5. CREDIT USAGE TABLE
-- ===========================================
create table if not exists public.credit_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  action text not null check (action in ('generation', 'variant', 'edit')),
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.credit_usage enable row level security;

-- Users can only view their own credit usage
create policy "Users can view own credit usage" on public.credit_usage
  for select using (auth.uid() = user_id);

create policy "Users can insert own credit usage" on public.credit_usage
  for insert with check (auth.uid() = user_id);

-- ===========================================
-- 6. HELPER FUNCTIONS
-- ===========================================

-- Function to deduct credits
create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_action text,
  p_project_id uuid default null
)
returns boolean as $$
declare
  v_current_credits integer;
begin
  -- Get current credits
  select credits_remaining into v_current_credits
  from public.profiles
  where id = p_user_id;

  -- Check if user has enough credits
  if v_current_credits < p_amount then
    return false;
  end if;

  -- Deduct credits
  update public.profiles
  set 
    credits_remaining = credits_remaining - p_amount,
    updated_at = now()
  where id = p_user_id;

  -- Log usage
  insert into public.credit_usage (user_id, amount, action, project_id)
  values (p_user_id, p_amount, p_action, p_project_id);

  return true;
end;
$$ language plpgsql security definer;

-- Function to reset daily credits for free users
create or replace function public.reset_free_credits()
returns void as $$
begin
  update public.profiles
  set 
    credits_remaining = 100,
    credits_reset_at = now() + interval '1 day',
    updated_at = now()
  where 
    plan_type = 'free'
    and credits_reset_at <= now();
end;
$$ language plpgsql security definer;

-- Updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_projects_updated_at
  before update on public.projects
  for each row execute procedure public.update_updated_at_column();

create trigger update_canvas_nodes_updated_at
  before update on public.canvas_nodes
  for each row execute procedure public.update_updated_at_column();

-- ===========================================
-- 7. REALTIME SUBSCRIPTIONS
-- ===========================================
-- Enable realtime for canvas_nodes
alter publication supabase_realtime add table public.canvas_nodes;

-- ===========================================
-- 8. PUBLISHED PAGES TABLE (for sharing)
-- ===========================================
create table if not exists public.published_pages (
  id uuid primary key default gen_random_uuid(),  -- Also used as public slug
  node_id text references public.canvas_nodes(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  html_snapshot text,  -- HTML snapshot for public viewing
  is_published boolean default true,
  view_count integer default 0,
  published_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.published_pages enable row level security;

-- IMPORTANT: Public can view published pages (anonymous access)
create policy "Anyone can view published pages" on public.published_pages
  for select using (is_published = true);

-- Owner can view all their pages (including unpublished)
create policy "Owners can view all own pages" on public.published_pages
  for select using (auth.uid() = user_id);

-- Owners can create published pages
create policy "Owners can create published pages" on public.published_pages
  for insert with check (auth.uid() = user_id);

-- Owners can update their published pages
create policy "Owners can update own published pages" on public.published_pages
  for update using (auth.uid() = user_id);

-- Owners can delete their published pages
create policy "Owners can delete own published pages" on public.published_pages
  for delete using (auth.uid() = user_id);

-- Function to increment view count (security definer to bypass RLS)
create or replace function public.increment_page_view(page_id uuid)
returns void as $$
begin
  update public.published_pages
  set view_count = view_count + 1
  where id = page_id and is_published = true;
end;
$$ language plpgsql security definer;

-- Trigger for updated_at
create trigger update_published_pages_updated_at
  before update on public.published_pages
  for each row execute procedure public.update_updated_at_column();

-- ===========================================
-- 9. INDEXES FOR PERFORMANCE
-- ===========================================
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_canvas_nodes_project_id on public.canvas_nodes(project_id);
create index if not exists idx_credit_usage_user_id on public.credit_usage(user_id);
create index if not exists idx_profiles_plan_type on public.profiles(plan_type);
create index if not exists idx_published_pages_node_id on public.published_pages(node_id);
create index if not exists idx_published_pages_user_id on public.published_pages(user_id);
create index if not exists idx_published_pages_is_published on public.published_pages(is_published);

