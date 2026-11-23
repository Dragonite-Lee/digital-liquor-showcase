-- 2단계: 사용자 식별과 서버 기록용 테이블.
-- 적용: npx supabase db push
--
-- 원칙
--  - 모든 테이블에 RLS를 켠다. 앱(사용자 JWT)은 자기 행을 "읽기"만 한다.
--  - 쓰기(구매 기록, 그림 작업, 사용량)는 Edge Function이 secret 키로만 한다. 앱에서 조작할 수 없게.
--  - 사용자 행은 auth.users가 지워지면 같이 지워진다 (앱 안 계정 삭제 대비).

-- 사용자 ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

-- 익명 로그인 포함, 새 사용자가 생기면 profiles에 한 줄 만든다
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 구매한 테마 ---------------------------------------------------------------
-- product_id: kr.dragonite.suljang.theme.{monet,vangogh,modern,all}
create table public.entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null check (product_id like 'kr.dragonite.suljang.%'),
  source text not null default 'app_store' check (source in ('app_store', 'play_store', 'grant')),
  transaction_id text,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- 같은 영수증을 다른 계정에 두 번 쓰지 못하게
create unique index entitlements_transaction_unique
  on public.entitlements (source, transaction_id) where transaction_id is not null;

alter table public.entitlements enable row level security;

create policy "entitlements: read own" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);

-- 그림 작업 (4단계 큐에서 쓴다) ----------------------------------------------
create type public.art_job_status as enum ('queued', 'running', 'done', 'failed');

create table public.art_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bottle_id text not null,
  theme text not null check (theme in ('watercolor', 'monet', 'vangogh', 'modern')),
  status public.art_job_status not null default 'queued',
  attempts smallint not null default 0 check (attempts >= 0),
  input_path text not null,
  input_hash text,
  output_path text,
  provider text,
  model text,
  cost_usd numeric(10, 5),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 워커가 오래된 대기 작업부터 꺼낸다
create index art_jobs_queue on public.art_jobs (created_at) where status = 'queued';
-- 같은 사진·같은 테마 결과 재사용 (5단계 캐시)
create index art_jobs_cache on public.art_jobs (input_hash, theme) where status = 'done';
create index art_jobs_user on public.art_jobs (user_id, created_at desc);

alter table public.art_jobs enable row level security;

create policy "art_jobs: read own" on public.art_jobs
  for select to authenticated using ((select auth.uid()) = user_id);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger art_jobs_touch
  before update on public.art_jobs
  for each row execute function public.touch_updated_at();

-- 하루 사용량 (5단계 한도 검사에서 쓴다) -------------------------------------
-- day는 한국 날짜 기준
create table public.usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Seoul')::date,
  art_count integer not null default 0 check (art_count >= 0),
  classify_count integer not null default 0 check (classify_count >= 0),
  primary key (user_id, day)
);

alter table public.usage_daily enable row level security;

create policy "usage_daily: read own" on public.usage_daily
  for select to authenticated using ((select auth.uid()) = user_id);

-- 앱이 쓰기 권한을 갖지 않도록 명시적으로 막는다 (RLS가 있어도 이중으로)
revoke insert, update, delete on public.profiles, public.entitlements, public.art_jobs, public.usage_daily
  from anon, authenticated;

-- 사진 저장소 --------------------------------------------------------------
-- originals: 앱이 올리는 원본(줄인) 사진 · art: 함수가 저장하는 그림 결과. 둘 다 비공개.
-- 경로 규칙: {user_id}/{파일 이름}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('originals', 'originals', false, 5242880, array['image/jpeg', 'image/png']),
  ('art', 'art', false, 10485760, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy "originals: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'originals' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "originals: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'originals' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "originals: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'originals' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "art: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'art' and (storage.foldername(name))[1] = (select auth.uid())::text);
