create extension if not exists pgcrypto;

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  completed boolean not null default false,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_todos_updated_at on public.todos;
create trigger set_todos_updated_at
before update on public.todos
for each row execute function public.set_updated_at();

alter table public.todos enable row level security;

-- RLS policies
create policy "Users can view their todos" on public.todos
  for select using (auth.uid() = user_id);

create policy "Users can insert their todos" on public.todos
  for insert with check (auth.uid() = user_id);

create policy "Users can update their todos" on public.todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their todos" on public.todos
  for delete using (auth.uid() = user_id);
