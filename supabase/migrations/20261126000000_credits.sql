-- 변환권: 테마는 모두 열고, 그림 한 장마다 변환권 1장을 쓴다.
-- 앱 구매자는 로그인(Apple·Google)하면 계정당 한 번 10장. 충전은 소모성 인앱 상품(RevenueCat 웹훅).
-- 하루 200장은 버그 대비 퓨즈. 적용: npx supabase db push --remote

-- 이전 단계의 "하루 10장" 함수는 퓨즈로 대체한다
drop function if exists public.claim_art(uuid, integer);
drop function if exists public.refund_art(uuid);

create table public.credits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 변동 기록. ref가 같은 지급은 두 번 들어가지 않는다 (웹훅 재전송·중복 대비)
create table public.credit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('welcome', 'purchase', 'refund', 'spend', 'spend_refund', 'admin')),
  ref text unique,
  created_at timestamptz not null default now()
);
create index credit_events_user on public.credit_events (user_id, created_at desc);

-- 첫 10장을 받은 로그인 계정. 계정 삭제 뒤 같은 Apple·Google로 다시 받지 못하게 사용자와 따로 둔다
create table public.welcome_grants (
  provider text not null,
  provider_id text not null,
  user_id uuid,
  created_at timestamptz not null default now(),
  primary key (provider, provider_id)
);

alter table public.credits enable row level security;
alter table public.credit_events enable row level security;
alter table public.welcome_grants enable row level security;
create policy "read own credits" on public.credits for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own credit events" on public.credit_events for select to authenticated using ((select auth.uid()) = user_id);
-- welcome_grants: 정책 없음 = 앱에서 못 읽고 못 씀

-- 지급·회수 (ref가 이미 있으면 아무것도 안 하고 false). 잔액을 돌려준다.
create function public.grant_credits(p_user uuid, p_delta integer, p_reason text, p_ref text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  begin
    insert into public.credit_events (user_id, delta, reason, ref) values (p_user, p_delta, p_reason, p_ref);
  exception when unique_violation then
    select balance into n from public.credits where user_id = p_user;
    return coalesce(n, 0);
  end;
  insert into public.credits as c (user_id, balance) values (p_user, p_delta)
  on conflict (user_id) do update set balance = c.balance + p_delta, updated_at = now()
  returning c.balance into n;
  return n;
end;
$$;

-- 그림 한 장: 퓨즈(오늘 p_cap장)와 잔액을 확인하고 1장 쓴다.
-- 돌려주는 값: 남은 잔액(0 이상), -1 = 변환권 없음, -2 = 오늘 퓨즈에 닿음
create function public.spend_credit(p_user uuid, p_cap integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  used integer;
begin
  update public.credits set balance = balance - 1, updated_at = now()
   where user_id = p_user and balance > 0
  returning balance into n;
  if n is null then
    return -1;
  end if;

  insert into public.usage_daily as u (user_id, art_count) values (p_user, 1)
  on conflict (user_id, day) do update set art_count = u.art_count + 1 where u.art_count < p_cap
  returning u.art_count into used;
  if used is null then
    update public.credits set balance = balance + 1, updated_at = now() where user_id = p_user;
    return -2;
  end if;

  insert into public.credit_events (user_id, delta, reason) values (p_user, -1, 'spend');
  return n;
end;
$$;

-- 그리기에 실패하면 1장과 퓨즈 사용량을 돌려준다
create function public.refund_credit(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.usage_daily set art_count = greatest(art_count - 1, 0)
   where user_id = p_user and day = (now() at time zone 'Asia/Seoul')::date;
  insert into public.credit_events (user_id, delta, reason) values (p_user, 1, 'spend_refund');
  update public.credits set balance = balance + 1, updated_at = now() where user_id = p_user
  returning balance into n;
  return coalesce(n, 0);
end;
$$;

-- 로그인한 계정에 첫 10장. Apple·Google 계정마다 한 번뿐. 잔액을 돌려준다.
create function public.claim_welcome(p_user uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  select balance into n from public.credits where user_id = p_user;
  -- 익명 사용자는 받을 수 없다 (연결된 Apple·Google 계정이 있어야 함)
  if not exists (select 1 from auth.identities where user_id = p_user and provider in ('apple', 'google')) then
    return coalesce(n, 0);
  end if;
  -- 이 Apple·Google 계정이 (지금이든 삭제된 예전 사용자든) 이미 받았으면 끝
  if exists (
    select 1 from auth.identities i
      join public.welcome_grants w on w.provider = i.provider and w.provider_id = i.provider_id
     where i.user_id = p_user and i.provider in ('apple', 'google')
  ) then
    return coalesce(n, 0);
  end if;

  insert into public.welcome_grants (provider, provider_id, user_id)
  select provider, provider_id, p_user from auth.identities
   where user_id = p_user and provider in ('apple', 'google')
  on conflict do nothing;
  return public.grant_credits(p_user, p_amount, 'welcome', 'welcome:' || p_user::text);
end;
$$;

revoke execute on function public.grant_credits(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.spend_credit(uuid, integer) from public, anon, authenticated;
revoke execute on function public.refund_credit(uuid) from public, anon, authenticated;
revoke execute on function public.claim_welcome(uuid, integer) from public, anon, authenticated;
grant execute on function public.grant_credits(uuid, integer, text, text) to service_role;
grant execute on function public.spend_credit(uuid, integer) to service_role;
grant execute on function public.refund_credit(uuid) to service_role;
grant execute on function public.claim_welcome(uuid, integer) to service_role;
