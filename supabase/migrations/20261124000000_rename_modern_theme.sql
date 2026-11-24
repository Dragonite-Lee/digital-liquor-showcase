-- '현대회화'(modern) 테마 이름을 '크레용'(crayon)으로 바꾼다.
update public.art_jobs set theme = 'crayon' where theme = 'modern';
update public.entitlements set product_id = 'kr.dragonite.suljang.theme.crayon'
  where product_id = 'kr.dragonite.suljang.theme.modern';

alter table public.art_jobs drop constraint art_jobs_theme_check;
alter table public.art_jobs add constraint art_jobs_theme_check
  check (theme in ('watercolor', 'monet', 'vangogh', 'crayon'));
