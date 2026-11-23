// 실제 모델은 부르지 않는다: fetch를 가짜로 바꿔 재시도·파싱·모델 선택만 확인한다 (비용 0).
// 실행: deno test -A supabase/functions/_tests
import { deepStrictEqual as assertEquals, rejects } from 'node:assert/strict';

const assertRejects = (fn: () => Promise<unknown>, type: new (...a: never[]) => Error) => rejects(fn, type);

import { fetchWithRetry } from '../_shared/http.ts';
import { pickImage } from '../illustrate-bottle/providers/cloudflare.ts';
import { pickGeminiImage } from '../illustrate-bottle/providers/google.ts';
import { providerFor } from '../illustrate-bottle/providers/index.ts';

const noSleep = () => Promise.resolve();

function fakeFetch(statuses: (number | 'net')[]) {
  const calls: number[] = [];
  const original = globalThis.fetch;
  let i = 0;
  globalThis.fetch = (() => {
    const s = statuses[Math.min(i, statuses.length - 1)];
    calls.push(i++);
    if (s === 'net') return Promise.reject(new TypeError('network down'));
    return Promise.resolve(new Response(`body ${s}`, { status: s }));
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}

Deno.test('429 뒤 성공하면 다시 시도해서 성공을 돌려준다', async () => {
  const f = fakeFetch([429, 200]);
  try {
    const res = await fetchWithRetry('https://x', {}, { sleep: noSleep });
    assertEquals(res.status, 200);
    assertEquals(f.calls.length, 2);
  } finally {
    f.restore();
  }
});

Deno.test('계속 5xx면 정해진 횟수(3)만 시도하고 멈춘다 — 무한 요청 없음', async () => {
  const f = fakeFetch([503]);
  try {
    const res = await fetchWithRetry('https://x', {}, { sleep: noSleep });
    assertEquals(res.status, 503);
    assertEquals(f.calls.length, 3);
  } finally {
    f.restore();
  }
});

Deno.test('400·401·422 같은 오류는 다시 시도하지 않는다', async () => {
  for (const status of [400, 401, 422]) {
    const f = fakeFetch([status]);
    try {
      const res = await fetchWithRetry('https://x', {}, { sleep: noSleep });
      assertEquals(res.status, status);
      assertEquals(f.calls.length, 1);
    } finally {
      f.restore();
    }
  }
});

Deno.test('네트워크 오류도 3번까지만 시도하고 오류를 던진다', async () => {
  const f = fakeFetch(['net']);
  try {
    await assertRejects(() => fetchWithRetry('https://x', {}, { sleep: noSleep }), TypeError);
    assertEquals(f.calls.length, 3);
  } finally {
    f.restore();
  }
});

Deno.test('대기 시간은 Retry-After를 따르되 최대값에서 자른다', async () => {
  const waits: number[] = [];
  const original = globalThis.fetch;
  let n = 0;
  globalThis.fetch = (() =>
    Promise.resolve(
      n++ === 0 ? new Response('', { status: 429, headers: { 'retry-after': '120' } }) : new Response('ok'),
    )) as typeof fetch;
  try {
    await fetchWithRetry('https://x', {}, { sleep: (ms) => (waits.push(ms), Promise.resolve()), maxWaitMs: 10_000 });
    assertEquals(waits, [10_000]);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('Cloudflare 응답: 한 겹 더 감싼 형태도 꺼낸다', () => {
  assertEquals(pickImage({ result: { result: { image: 'https://a/b.png' } } }), 'https://a/b.png');
  assertEquals(pickImage({ result: { image: 'abc' } }), 'abc');
  assertEquals(pickImage({ result: {} }), null);
});

Deno.test('Gemini 응답: 이미지와 차단 사유를 구분한다', () => {
  assertEquals(
    pickGeminiImage({ candidates: [{ content: { parts: [{ text: 'hi' }, { inlineData: { data: 'IMG' } }] } }] }),
    { image: 'IMG' },
  );
  assertEquals(pickGeminiImage({ promptFeedback: { blockReason: 'SAFETY' } }), { blocked: 'SAFETY' });
  assertEquals(pickGeminiImage({ candidates: [{ finishReason: 'IMAGE_SAFETY', content: { parts: [] } }] }), {
    blocked: 'IMAGE_SAFETY',
  });
});

Deno.test('모델 선택: 테마별 → 전체 → 기본 cloudflare', () => {
  const env = (map: Record<string, string>) => (k: string) => map[k];
  assertEquals(providerFor('monet', env({})).id, 'cloudflare');
  assertEquals(providerFor('monet', env({ ART_PROVIDER: 'google' })).id, 'google');
  assertEquals(providerFor('monet', env({ ART_PROVIDER: 'google', ART_PROVIDER_MONET: 'cloudflare' })).id, 'cloudflare');
  assertEquals(providerFor('monet', env({ ART_PROVIDER: 'nope' })).id, 'cloudflare');
});
