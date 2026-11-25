// RevenueCat 웹훅 이벤트 해석 (DB는 가짜)
import { deepStrictEqual as assertEquals } from 'node:assert/strict';

import { handleEvent, type RcEvent } from '../revenuecat-webhook/events.ts';

const user = '6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b';
function fakeGrant() {
  const refs = new Map<string, number>();
  let balance = 0;
  return {
    calls: refs,
    grant: (_u: string, delta: number, _r: string, ref: string) => {
      if (!refs.has(ref)) {
        refs.set(ref, delta);
        balance += delta;
      }
      return Promise.resolve(balance);
    },
  };
}
const buy: RcEvent = { type: 'NON_RENEWING_PURCHASE', app_user_id: user, product_id: 'kr.dragonite.suljang.credits.20', transaction_id: 't1' };

Deno.test('구매하면 상품 장수만큼 충전', async () => {
  const f = fakeGrant();
  assertEquals(await handleEvent(buy, f.grant), { action: 'granted', balance: 20 });
});

Deno.test('같은 거래가 두 번 와도 한 번만', async () => {
  const f = fakeGrant();
  await handleEvent(buy, f.grant);
  assertEquals((await handleEvent(buy, f.grant)).balance, 20);
});

Deno.test('환불(CANCELLATION)은 회수', async () => {
  const f = fakeGrant();
  await handleEvent(buy, f.grant);
  assertEquals(await handleEvent({ ...buy, type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT' }, f.grant), {
    action: 'revoked',
    balance: 0,
  });
});

Deno.test('익명 RevenueCat id면 aliases에서 사용자 id를 찾는다', async () => {
  const f = fakeGrant();
  const e = { ...buy, app_user_id: '$RCAnonymousID:abc', aliases: ['$RCAnonymousID:abc', user] };
  assertEquals((await handleEvent(e, f.grant)).action, 'granted');
});

Deno.test('모르는 상품·이벤트·사용자는 무시', async () => {
  const f = fakeGrant();
  assertEquals((await handleEvent({ ...buy, product_id: 'x' }, f.grant)).action, 'ignored');
  assertEquals((await handleEvent({ ...buy, type: 'TEST' }, f.grant)).action, 'ignored');
  assertEquals((await handleEvent({ ...buy, app_user_id: '$RCAnonymousID:abc' }, f.grant)).action, 'ignored');
  assertEquals(f.calls.size, 0);
});
