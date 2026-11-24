// 앱 안 계정 삭제 (App Store 심사 요구사항 5.1.1(v)).
// 로그인한 사용자 본인만 지울 수 있다. 사진 저장소의 파일을 지운 뒤 auth 사용자를 지우면
// profiles·entitlements·art_jobs·usage_daily 행은 외래 키로 함께 지워진다.
// 배포: supabase functions deploy delete-account
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { requireUser } from '../_shared/auth.ts';
import { cors, json } from '../_shared/http.ts';

/** 함수 환경의 secret 키 (JSON 객체 또는 문자열), 없으면 예전 service_role 키 */
function secretKey(): string | undefined {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const first = typeof parsed === 'string' ? parsed : Object.values(parsed ?? {})[0];
      if (typeof first === 'string' && first) return first;
    } catch {
      if (raw.trim()) return raw.trim();
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}

// deno-lint-ignore no-explicit-any
async function removeFolder(admin: SupabaseClient<any, any, any>, bucket: string, userId: string) {
  // 한 번에 1000개씩 나눠 지운다
  for (;;) {
    const { data, error } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
    if (error || !data?.length) return;
    await admin.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
    if (data.length < 1000) return;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const caller = await requireUser(req);
  if (caller instanceof Response) return caller;

  const url = Deno.env.get('SUPABASE_URL');
  const key = secretKey();
  if (!url || !key) return json({ error: 'server not configured' }, 500);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  await removeFolder(admin, 'originals', caller.id);
  await removeFolder(admin, 'art', caller.id);
  const { error } = await admin.auth.admin.deleteUser(caller.id);
  if (error) {
    console.error('delete-account', caller.id, error.message);
    return json({ error: 'delete failed' }, 500);
  }
  console.log('delete-account', caller.id);
  return json({ deleted: true });
});
