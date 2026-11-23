// 사용자 토큰 확인 — 실제 Auth 서버 대신 가짜 검증기를 쓴다 (비용·네트워크 없음).
import { deepStrictEqual as assertEquals, ok } from 'node:assert/strict';

import { bearer, publishableKey, requireUser, type Verify } from '../_shared/auth.ts';

const req = (auth?: string) => new Request('https://x', { method: 'POST', headers: auth ? { authorization: auth } : {} });
const valid: Verify = (t) => Promise.resolve(t === 'good' ? { sub: 'user-1', is_anonymous: true } : null);

Deno.test('토큰이 없거나 publishable 키뿐이면 401', async () => {
  for (const r of [req(), req('Bearer sb_publishable_abc'), req('Basic xyz')]) {
    const out = await requireUser(r, valid);
    ok(out instanceof Response);
    assertEquals(out.status, 401);
  }
});

Deno.test('검증에 실패한 토큰은 401', async () => {
  const out = await requireUser(req('Bearer bad'), valid);
  ok(out instanceof Response);
  assertEquals(out.status, 401);
});

Deno.test('올바른 토큰이면 사용자 id를 돌려준다', async () => {
  assertEquals(await requireUser(req('Bearer good'), valid), { id: 'user-1', anonymous: true });
});

Deno.test('검증기 자체가 죽으면 500 (통과시키지 않는다)', async () => {
  const out = await requireUser(req('Bearer good'), () => Promise.reject(new Error('down')));
  ok(out instanceof Response);
  assertEquals(out.status, 500);
});

Deno.test('bearer 파싱', () => {
  assertEquals(bearer(req('bearer  abc.def ')), 'abc.def');
  assertEquals(bearer(req()), null);
});

Deno.test('publishable 키: JSON 객체·문자열·예전 anon 키', () => {
  const env = (m: Record<string, string>) => (k: string) => m[k];
  assertEquals(publishableKey(env({ SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_1"}' })), 'sb_publishable_1');
  assertEquals(publishableKey(env({ SUPABASE_PUBLISHABLE_KEYS: 'sb_publishable_2' })), 'sb_publishable_2');
  assertEquals(publishableKey(env({ SUPABASE_ANON_KEY: 'eyJanon' })), 'eyJanon');
});
