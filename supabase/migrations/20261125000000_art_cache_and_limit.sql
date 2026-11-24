-- 그림 비용 아끼기: 사용자별 캐시 조회용 인덱스 + 하루 생성 한도.
-- 적용: npx supabase db push --remote

-- 같은 사용자·같은 사진·같은 테마로 그린 그림 찾기
create index if not exists art_jobs_user_cache
  on public.art_jobs (user_id, input_hash, theme, created_at desc) where status = 'done';

-- 오늘(한국 날짜) 그림 사용량을 1 올린다. 한도에 닿았으면 올리지 않고 -1.
-- 한 줄짜리 upsert라 동시에 여러 요청이 와도 한도를 넘지 않는다.
create function public.claim_art(p_user uuid, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if p_limit <= 0 then
    return -1;
  end if;
  insert into public.usage_daily as u (user_id, art_count)
  values (p_user, 1)
  on conflict (user_id, day) do update
    set art_count = u.art_count + 1
    where u.art_count < p_limit
  returning u.art_count into n;
  return coalesce(n, -1);
end;
$$;

-- 그리기에 실패하면 올린 사용량을 돌려준다
create function public.refund_art(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.usage_daily
     set art_count = greatest(art_count - 1, 0)
   where user_id = p_user
     and day = (now() at time zone 'Asia/Seoul')::date;
$$;

-- Edge Function(secret 키)만 부른다. 앱에서는 못 부르게.
revoke execute on function public.claim_art(uuid, integer) from public, anon, authenticated;
revoke execute on function public.refund_art(uuid) from public, anon, authenticated;
grant execute on function public.claim_art(uuid, integer) to service_role;
grant execute on function public.refund_art(uuid) to service_role;
