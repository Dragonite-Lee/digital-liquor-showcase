// RevenueCat → 변환권 충전·환불 회수.
// RevenueCat 대시보드 Integrations → Webhooks의 Authorization 값과 REVENUECAT_WEBHOOK_AUTH가 같아야 한다.
// 배포: supabase functions deploy revenuecat-webhook   (verify_jwt = false)
import { adminClient } from '../_shared/admin.ts';
import { json } from '../_shared/http.ts';
import { handleEvent, type RcEvent } from './events.ts';

/** 길이가 달라도 시간이 같게 비교한다 */
function same(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!secret) return json({ error: 'server not configured' }, 500);
  if (!same(req.headers.get('Authorization') ?? '', secret)) return json({ error: 'unauthorized' }, 401);

  let event: RcEvent;
  try {
    event = ((await req.json()) as { event?: RcEvent }).event ?? {};
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const admin = adminClient();
  if (!admin) return json({ error: 'server not configured' }, 500);

  try {
    const outcome = await handleEvent(event, async (user, delta, reason, ref) => {
      const { data, error } = await admin.rpc('grant_credits', { p_user: user, p_delta: delta, p_reason: reason, p_ref: ref });
      if (error) throw error;
      return data as number;
    });
    console.log('revenuecat', event.type, event.product_id, outcome.action, outcome.reason ?? '', outcome.balance ?? '');
    return json({ ok: true, ...outcome });
  } catch (e) {
    // 500을 돌려주면 RevenueCat이 다시 보낸다 (ref가 같아 두 번 지급되지 않음)
    console.error('revenuecat', event.type, event.transaction_id, e instanceof Error ? e.message : e);
    return json({ error: 'grant failed' }, 500);
  }
});
