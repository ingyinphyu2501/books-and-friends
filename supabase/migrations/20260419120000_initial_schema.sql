-- Books & Friends — initial schema + RLS (v1)
-- Apply in Supabase Dashboard → SQL Editor, or via Supabase CLI.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  author text not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.session_chapters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reading_sessions (id) on delete cascade,
  sort_order int not null,
  label text not null,
  unique (session_id, sort_order)
);

create table if not exists public.session_members (
  session_id uuid not null references public.reading_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.member_chapter_progress (
  session_id uuid not null references public.reading_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter_id uuid not null references public.session_chapters (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (session_id, user_id, chapter_id)
);

create table if not exists public.discussion_posts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reading_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint discussion_body_not_blank check (char_length(trim(body)) > 0)
);

create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.discussion_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint post_reactions_emoji_not_blank check (char_length(trim(emoji)) > 0),
  unique (post_id, user_id, emoji)
);

create index if not exists idx_reading_sessions_created_at on public.reading_sessions (created_at desc);
create index if not exists idx_session_chapters_session on public.session_chapters (session_id, sort_order);
create index if not exists idx_session_members_user on public.session_members (user_id);
create index if not exists idx_discussion_posts_session on public.discussion_posts (session_id, created_at);
create index if not exists idx_post_reactions_post on public.post_reactions (post_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(coalesce(new.email, 'reader'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.add_creator_as_session_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.session_members (session_id, user_id)
  values (new.id, new.creator_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists reading_sessions_add_creator_member on public.reading_sessions;
create trigger reading_sessions_add_creator_member
  after insert on public.reading_sessions
  for each row execute function public.add_creator_as_session_member();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.session_chapters enable row level security;
alter table public.session_members enable row level security;
alter table public.member_chapter_progress enable row level security;
alter table public.discussion_posts enable row level security;
alter table public.post_reactions enable row level security;

-- Profiles
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Reading sessions (all public read)
drop policy if exists "reading_sessions_select_authenticated" on public.reading_sessions;
create policy "reading_sessions_select_authenticated"
  on public.reading_sessions for select
  to authenticated
  using (true);

drop policy if exists "reading_sessions_insert_creator" on public.reading_sessions;
create policy "reading_sessions_insert_creator"
  on public.reading_sessions for insert
  to authenticated
  with check (creator_id = auth.uid());

drop policy if exists "reading_sessions_update_creator" on public.reading_sessions;
create policy "reading_sessions_update_creator"
  on public.reading_sessions for update
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

drop policy if exists "reading_sessions_delete_creator" on public.reading_sessions;
create policy "reading_sessions_delete_creator"
  on public.reading_sessions for delete
  to authenticated
  using (creator_id = auth.uid());

-- Session chapters (read for preview; write by session creator)
drop policy if exists "session_chapters_select_authenticated" on public.session_chapters;
create policy "session_chapters_select_authenticated"
  on public.session_chapters for select
  to authenticated
  using (true);

drop policy if exists "session_chapters_insert_creator" on public.session_chapters;
create policy "session_chapters_insert_creator"
  on public.session_chapters for insert
  to authenticated
  with check (
    exists (
      select 1 from public.reading_sessions rs
      where rs.id = session_id and rs.creator_id = auth.uid()
    )
  );

drop policy if exists "session_chapters_update_creator" on public.session_chapters;
create policy "session_chapters_update_creator"
  on public.session_chapters for update
  to authenticated
  using (
    exists (
      select 1 from public.reading_sessions rs
      where rs.id = session_id and rs.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.reading_sessions rs
      where rs.id = session_id and rs.creator_id = auth.uid()
    )
  );

drop policy if exists "session_chapters_delete_creator" on public.session_chapters;
create policy "session_chapters_delete_creator"
  on public.session_chapters for delete
  to authenticated
  using (
    exists (
      select 1 from public.reading_sessions rs
      where rs.id = session_id and rs.creator_id = auth.uid()
    )
  );

-- Session members
drop policy if exists "session_members_select_authenticated" on public.session_members;
create policy "session_members_select_authenticated"
  on public.session_members for select
  to authenticated
  using (true);

drop policy if exists "session_members_insert_self" on public.session_members;
create policy "session_members_insert_self"
  on public.session_members for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "session_members_delete_self" on public.session_members;
create policy "session_members_delete_self"
  on public.session_members for delete
  to authenticated
  using (user_id = auth.uid());

-- Member progress (read/write only for session members)
drop policy if exists "member_progress_select_members" on public.member_chapter_progress;
create policy "member_progress_select_members"
  on public.member_chapter_progress for select
  to authenticated
  using (
    exists (
      select 1 from public.session_members sm
      where sm.session_id = member_chapter_progress.session_id
        and sm.user_id = auth.uid()
    )
  );

drop policy if exists "member_progress_insert_self_member" on public.member_chapter_progress;
create policy "member_progress_insert_self_member"
  on public.member_chapter_progress for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.session_members sm
      where sm.session_id = member_chapter_progress.session_id
        and sm.user_id = auth.uid()
    )
  );

drop policy if exists "member_progress_delete_self_member" on public.member_chapter_progress;
create policy "member_progress_delete_self_member"
  on public.member_chapter_progress for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.session_members sm
      where sm.session_id = member_chapter_progress.session_id
        and sm.user_id = auth.uid()
    )
  );

-- Discussion (members only)
drop policy if exists "discussion_select_members" on public.discussion_posts;
create policy "discussion_select_members"
  on public.discussion_posts for select
  to authenticated
  using (
    exists (
      select 1 from public.session_members sm
      where sm.session_id = discussion_posts.session_id
        and sm.user_id = auth.uid()
    )
  );

drop policy if exists "discussion_insert_self_member" on public.discussion_posts;
create policy "discussion_insert_self_member"
  on public.discussion_posts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.session_members sm
      where sm.session_id = discussion_posts.session_id
        and sm.user_id = auth.uid()
    )
  );

drop policy if exists "discussion_update_own_member" on public.discussion_posts;
create policy "discussion_update_own_member"
  on public.discussion_posts for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.session_members sm
      where sm.session_id = discussion_posts.session_id
        and sm.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.session_members sm
      where sm.session_id = discussion_posts.session_id
        and sm.user_id = auth.uid()
    )
  );

drop policy if exists "discussion_delete_own_member" on public.discussion_posts;
create policy "discussion_delete_own_member"
  on public.discussion_posts for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.session_members sm
      where sm.session_id = discussion_posts.session_id
        and sm.user_id = auth.uid()
    )
  );

-- Reactions (members only)
drop policy if exists "reactions_select_members" on public.post_reactions;
create policy "reactions_select_members"
  on public.post_reactions for select
  to authenticated
  using (
    exists (
      select 1
      from public.discussion_posts p
      join public.session_members sm
        on sm.session_id = p.session_id and sm.user_id = auth.uid()
      where p.id = post_reactions.post_id
    )
  );

drop policy if exists "reactions_insert_self_member" on public.post_reactions;
create policy "reactions_insert_self_member"
  on public.post_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.discussion_posts p
      join public.session_members sm
        on sm.session_id = p.session_id and sm.user_id = auth.uid()
      where p.id = post_reactions.post_id
    )
  );

drop policy if exists "reactions_delete_self_member" on public.post_reactions;
create policy "reactions_delete_self_member"
  on public.post_reactions for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.discussion_posts p
      join public.session_members sm
        on sm.session_id = p.session_id and sm.user_id = auth.uid()
      where p.id = post_reactions.post_id
    )
  );
