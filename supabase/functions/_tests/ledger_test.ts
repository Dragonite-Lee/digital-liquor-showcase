// 캐시·하루 한도 규칙 (DB와 모델은 가짜, 비용 0). 실행: deno test -A supabase/functions/_tests
import { deepStrictEqual as assertEquals, rejects } from 'node:assert/strict';

import { illustrate, type Job, type Ledger } from '../illustrate-bottle/ledger.ts';

function fakeLedger(limit: number) {
  const store = new Map<string, string>();
  let used = 0;
  const records: Job[] = [];
  const ledger: Ledger = {
    cached: (u, h, t) => Promise.resolve(store.get(`${u}:${h}:${t}`) ?? null),
    claim: () => Promise.resolve(used < limit ? ++used : -1),
    refund: () => Promise.resolve(void (used = Math.max(0, used - 1))),
    record: (job) => {
      records.push(job);
      store.set(`${job.userId}:${job.hash}:${job.theme}`, job.image);
      return Promise.resolve();
    },
  };
  return { ledger, records, used: () => used };
}

const req = { userId: 'u1', image: 'AAAA'.repeat(40), mediaType: 'image/jpeg', theme: 'monet', bottleId: 'b1', redraw: false };
let draws = 0;
const provider = { id: 'fake', draw: () => Promise.resolve({ image: `ART${++draws}`, model: 'm' }) };

Deno.test('같은 사진·같은 테마는 두 번째부터 캐시 (모델 호출·한도 사용 없음)', async () => {
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

Deno.test('다시 그리기는 캐시를 건너뛰고 한도를 쓴다', async () => {
  const f = fakeLedger(10);
  await illustrate(f.ledger, provider, req, 10);
  const again = await illustrate(f.ledger, provider, { ...req, redraw: true }, 10);
  assertEquals(again.kind, 'drawn');
  assertEquals(f.used(), 2);
});

Deno.test('하루 한도에 닿으면 모델을 부르지 않는다', async () => {
  const f = fakeLedger(2);
  let calls = 0;
  const counting = { id: 'fake', draw: () => (calls++, Promise.resolve({ image: 'X', model: 'm' })) };
  for (const theme of ['monet', 'vangogh', 'crayon']) await illustrate(f.ledger, counting, { ...req, theme }, 2);
  const res = await illustrate(f.ledger, counting, { ...req, theme: 'watercolor' }, 2);
  assertEquals(res, { kind: 'limit', limit: 2 });
  assertEquals(calls, 2);
});

Deno.test('그리기에 실패하면 한도를 돌려준다', async () => {
  const f = fakeLedger(10);
  const broken = { id: 'fake', draw: () => Promise.reject(new Error('down')) };
  await rejects(() => illustrate(f.ledger, broken, req, 10));
  assertEquals(f.used(), 0);
  assertEquals(f.records.length, 0);
});

Deno.test('기록 저장이 실패해도 그림은 돌려준다', async () => {
  const f = fakeLedger(10);
  f.ledger.record = () => Promise.reject(new Error('storage down'));
  const res = await illustrate(f.ledger, provider, req, 10);
  assertEquals(res.kind, 'drawn');
});
