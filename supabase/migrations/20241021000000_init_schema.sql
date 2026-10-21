-- Extensions
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text,
  is_banned boolean default false,
  role text default 'student' check (role in ('admin', 'student')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger to create profile when auth.users is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Quiz Sets
create table if not exists public.quiz_sets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  is_active boolean default true,
  storage_file_path text,
  created_at timestamptz default now()
);

-- 3. Lessons
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references public.quiz_sets(id) on delete cascade not null,
  lesson_num int not null,
  title text not null,
  source_doc text,
  created_at timestamptz default now()
);

-- 4. Questions
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references public.quiz_sets(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade,
  lesson_num int not null,
  question_order int not null,
  question_text text not null,
  options jsonb not null,
  correct_option text not null,
  answer_text text,
  explanation text,
  source_ref text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 5. Quiz Attempts
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  set_id uuid references public.quiz_sets(id) on delete set null,
  total_questions int not null,
  correct_count int not null,
  score numeric(5,2) not null,
  duration_ms bigint not null,
  wrong_question_ids uuid[] default '{}',
  created_at timestamptz default now()
);

-- 6. Storage Bucket for Question Files
insert into storage.buckets (id, name, public)
values ('quiz-files', 'quiz-files', false)
on conflict (id) do nothing;

-- 7. RLS Helper & Policies
alter table public.profiles enable row level security;
alter table public.quiz_sets enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;

create or replace function public.is_active_user()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_banned = false
  );
$$ language sql security definer;

-- Profiles: Users can view their own profile; admins can view all
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view and edit all profiles"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Quiz Sets: Active users can read active sets
create policy "Active users can read active quiz sets"
  on public.quiz_sets for select
  using (public.is_active_user() and is_active = true);

-- Lessons: Active users can read lessons
create policy "Active users can read lessons"
  on public.lessons for select
  using (public.is_active_user());

-- Questions: Active users can read active questions
create policy "Active users can read active questions"
  on public.questions for select
  using (public.is_active_user() and is_active = true);

-- Quiz Attempts: Users can view and insert their own attempts
create policy "Users can view own attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id and public.is_active_user());

create policy "Users can insert own attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id and public.is_active_user());
