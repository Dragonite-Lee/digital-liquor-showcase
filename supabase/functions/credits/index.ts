// 남은 변환권. 로그인(Apple·Google)한 계정이면 이때 첫 10장을 받는다 (계정마다 한 번).
// 배포: supabase functions deploy credits
import { adminClient } from '../_shared/admin.ts';
import { requireUser } from '../_shared/auth.ts';
import { cors, json } from '../_shared/http.ts';

const WELCOME = Number(Deno.env.get('WELCOME_CREDITS') ?? 10);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const caller = await requireUser(req);
  if (caller instanceof Response) return caller;

  const admin = adminClient();
  if (!admin) return json({ error: 'server not configured' }, 500);

  // 익명 사용자는 claim_welcome이 지급 없이 잔액만 돌려준다
  const { data, error } = await admin.rpc('claim_welcome', { p_user: caller.id, p_amount: WELCOME });
  if (error) {
    console.error('credits', caller.id, error.message);
    return json({ error: 'credits failed' }, 500);
  }
  return json({ balance: typeof data === 'number' ? data : 0, anonymous: caller.anonymous });
});
