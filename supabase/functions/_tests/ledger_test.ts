// 캐시·변환권·퓨즈 규칙 (DB와 모델은 가짜, 비용 0). 실행: deno test -A supabase/functions/_tests
import { deepStrictEqual as assertEquals, rejects } from 'node:assert/strict';

import { illustrate, type Job, type Ledger } from '../illustrate-bottle/ledger.ts';

function fakeLedger(cap: number, credits = 100) {
  const store = new Map<string, string>();
  let used = 0;
  let balance = credits;
  const records: Job[] = [];
  const ledger: Ledger = {
    cached: (u, h, t) => Promise.resolve(store.get(`${u}:${h}:${t}`) ?? null),
    spend: () => {
      if (balance <= 0) return Promise.resolve(-1);
      if (used >= cap) return Promise.resolve(-2);
      used++;
      return Promise.resolve(--balance);
    },
    refund: () => Promise.resolve(void ((used = Math.max(0, used - 1)), balance++)),
    record: (job) => {
      records.push(job);
      store.set(`${job.userId}:${job.hash}:${job.theme}`, job.image);
      return Promise.resolve();
    },
  };
  return { ledger, records, used: () => used, balance: () => balance };
}

const req = { userId: 'u1', image: 'AAAA'.repeat(40), mediaType: 'image/jpeg', theme: 'monet', bottleId: 'b1', redraw: false };
let draws = 0;
const provider = { id: 'fake', draw: () => Promise.resolve({ image: `ART${++draws}`, model: 'm' }) };

Deno.test('같은 사진·같은 테마는 두 번째부터 캐시 (모델 호출·변환권 사용 없음)', async () => {
  const f = fakeLedger(10);
  const first = await illustrate(f.ledger, provider, req, 10);
  const second = await illustrate(f.ledger, provider, req, 10);
  assertEquals(first.kind, 'drawn');
  assertEquals(second, { kind: 'cached', image: (first as { image: string }).image });
  assertEquals(f.used(), 1);
});

Deno.test('테마가 다르면 새로 그린다', async () => {
  const f = fakeLedger(10);
  await illustrate(f.ledger, provider, req, 10);
  const other = await illustrate(f.ledger, provider, { ...req, theme: 'vangogh' }, 10);
  assertEquals(other.kind, 'drawn');
  assertEquals(f.used(), 2);
});

Deno.test('redraw는 캐시를 건너뛰고 변환권을 쓴다', async () => {
  const f = fakeLedger(10);
  await illustrate(f.ledger, provider, req, 10);
  const again = await illustrate(f.ledger, provider, { ...req, redraw: true }, 10);
  assertEquals(again.kind, 'drawn');
  assertEquals(f.used(), 2);
});

Deno.test('퓨즈에 닿으면 모델을 부르지 않는다', async () => {
  const f = fakeLedger(2);
  let calls = 0;
  const counting = { id: 'fake', draw: () => (calls++, Promise.resolve({ image: 'X', model: 'm' })) };
  for (const theme of ['monet', 'vangogh', 'crayon']) await illustrate(f.ledger, counting, { ...req, theme }, 2);
  const res = await illustrate(f.ledger, counting, { ...req, theme: 'watercolor' }, 2);
  assertEquals(res, { kind: 'limit', limit: 2 });
  assertEquals(calls, 2);
});

Deno.test('그리기에 실패하면 변환권을 돌려준다', async () => {
  const f = fakeLedger(10);
  const broken = { id: 'fake', draw: () => Promise.reject(new Error('down')) };
  await rejects(() => illustrate(f.ledger, broken, req, 10));
  assertEquals(f.used(), 0);
  assertEquals(f.balance(), 100);
  assertEquals(f.records.length, 0);
});

Deno.test('기록 저장이 실패해도 그림은 돌려준다', async () => {
  const f = fakeLedger(10);
  f.ledger.record = () => Promise.reject(new Error('storage down'));
  const res = await illustrate(f.ledger, provider, req, 10);
  assertEquals(res.kind, 'drawn');
});

Deno.test('변환권이 없으면 모델을 부르지 않는다', async () => {
  const f = fakeLedger(200, 1);
  let calls = 0;
  const counting = { id: 'fake', draw: () => (calls++, Promise.resolve({ image: 'X', model: 'm' })) };
  const first = await illustrate(f.ledger, counting, req, 200);
  assertEquals(first.kind === 'drawn' && first.balance, 0);
  const second = await illustrate(f.ledger, counting, { ...req, theme: 'crayon' }, 200);
  assertEquals(second, { kind: 'no_credits' });
  assertEquals(calls, 1);
});

Deno.test('캐시된 그림은 변환권이 없어도 돌려준다', async () => {
  const f = fakeLedger(200, 1);
  await illustrate(f.ledger, provider, req, 200);
  const again = await illustrate(f.ledger, provider, req, 200);
  assertEquals(again.kind, 'cached');
});
