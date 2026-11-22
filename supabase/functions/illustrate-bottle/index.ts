// 병 사진 → 테마별 그림(수채화·모네·고흐·현대회화). Supabase Edge Function (Deno) → Cloudflare Workers AI (FLUX.2 [klein] 9B).
// 배포: supabase functions deploy illustrate-bottle   (verify_jwt는 supabase/config.toml에서 끔)
// 시크릿: supabase secrets set CF_ACCOUNT_ID=... CF_API_TOKEN=...   (토큰 권한: Workers AI)
import { DEFAULT_STYLES } from './prompts.ts';

const MODEL = Deno.env.get('ILLUSTRATE_MODEL') ?? '@cf/black-forest-labs/flux-2-klein-9b';
// FLUX의 안전 필터에 막히면 쓰는 모델 (Cloudflare 카탈로그의 Google 모델, Cloudflare 크레딧으로 결제)
const FALLBACK = Deno.env.get('ILLUSTRATE_FALLBACK') ?? 'google/nano-banana';
const GATEWAY = Deno.env.get('CF_GATEWAY_ID') ?? 'default';
// 라벨 있는 병은 FLUX 안전 필터에 거의 다 막혀서, 기본은 FLUX를 건너뛰고 바로 대체 모델로 간다.
// 다시 FLUX부터 시도하려면: supabase secrets set ILLUSTRATE_TRY_FLUX=1
const TRY_FLUX = Deno.env.get('ILLUSTRATE_TRY_FLUX') === '1';

// 모든 테마 공통: 병 모양·라벨은 그대로, 배경은 흰색(앱에서 다시 병만 떼어 낸다)
// 모든 테마 뒤에 붙이는 공통 지시. 테마 프롬프트에 이미 들어 있어 짧게 둔다.
const KEEP =
  Deno.env.get('PROMPT_KEEP') ??
  'Reminder: exactly one bottle, upright and fully visible, on a flat plain pure white background with nothing else.';

// 프롬프트는 코드 수정 없이 Supabase 시크릿으로 바꿀 수 있다 (PROMPT_WATERCOLOR, PROMPT_MONET, PROMPT_VANGOGH, PROMPT_MODERN, PROMPT_KEEP)
const STYLES: Record<string, string> = Object.fromEntries(
  Object.entries(DEFAULT_STYLES).map(([id, text]) => [id, Deno.env.get(`PROMPT_${id.toUpperCase()}`) ?? text]),
);


const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function decode(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  // 이 프로젝트의 publishable 키를 들고 온 요청만 받는다 (키 자체는 공개값이라 남용을 완전히 막지는 못한다)
  const caller = req.headers.get('apikey') ?? '';
  const known = `${Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? ''} ${Deno.env.get('SUPABASE_ANON_KEY') ?? ''}`;
  if (caller.length < 20 || !known.includes(caller)) return json({ error: 'unknown apikey' }, 401);

  const account = Deno.env.get('CF_ACCOUNT_ID');
  const token = Deno.env.get('CF_API_TOKEN');
  if (!account || !token) return json({ error: 'CF_ACCOUNT_ID / CF_API_TOKEN is not set' }, 500);

  let image: string;
  let mediaType: string;
  let style: string;
  try {
    const body = await req.json();
    image = body.image;
    mediaType = body.mediaType ?? 'image/jpeg';
    style = STYLES[body.theme] ?? STYLES.watercolor;
    if (typeof image !== 'string' || image.length < 100) throw new Error('missing image');
    if (image.length > 3_000_000) return json({ error: 'image too large' }, 413);
  } catch {
    return json({ error: 'Body must be { image: base64, mediaType? }' }, 400);
  }

  const bytes = decode(image);
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run`;

  let firstText = '';
  if (TRY_FLUX) {
    // 1) FLUX.2 [klein] — 싸고 빠르다
    const form = new FormData();
    form.append('prompt', `${style} ${KEEP}`);
    form.append('input_image_0', new Blob([bytes], { type: mediaType }), mediaType === 'image/png' ? 'bottle.png' : 'bottle.jpg');
    form.append('width', '640');
    form.append('height', '1024');
    form.append('seed', String(Math.floor(Math.random() * 2_000_000_000)));
    // 게이트웨이를 지정해 FLUX 호출도 AI Gateway 로그에 남긴다 (결제는 Workers AI 무료 한도 그대로)
    const first = await fetch(`${base}/${MODEL}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'cf-aig-gateway-id': GATEWAY },
      body: form,
    });
    firstText = await first.text();
    if (first.ok) {
      try {
        const out = JSON.parse(firstText)?.result?.image;
        if (typeof out === 'string') return json({ image: out, model: MODEL });
      } catch {
        // 아래 대체 모델로
      }
    }
    console.error('workers-ai', first.status, firstText.slice(0, 300));
    // 인증·한도 오류면 대체 모델도 같은 계정이라 소용없다
    if (first.status === 401 || first.status === 403) {
      return json({ error: 'illustrator upstream failed', status: first.status, detail: firstText.slice(0, 300) }, 502);
    }
  }

  // 2) 대체 모델 — FLUX의 안전 필터가 상표 라벨을 자주 막는다
  const second = await fetch(base, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'cf-aig-gateway-id': GATEWAY },
    body: JSON.stringify({
      model: FALLBACK,
      input: {
        prompt: `${style} ${KEEP}`,
        image_input: [`data:${mediaType};base64,${image}`],
        aspect_ratio: '2:3',
        output_format: 'png',
        image_size: '1K',
      },
    }),
  });
  const secondText = await second.text();
  if (!second.ok) {
    console.error('fallback', second.status, secondText.slice(0, 300));
    return json(
      {
        error: /flagged/i.test(firstText) ? 'flagged' : 'illustrator upstream failed',
        status: second.status,
        detail: `klein: ${firstText.slice(0, 150)} | ${FALLBACK}: ${secondText.slice(0, 200)}`,
      },
      /flagged/i.test(firstText) && second.status < 500 ? 422 : 502,
    );
  }
  try {
    const data = JSON.parse(secondText);
    // 응답이 { result: { state, result: { image } } } 처럼 한 겹 더 감싸여 온다
    const out: unknown = data?.result?.result?.image ?? data?.result?.image ?? data?.image;
    if (typeof out !== 'string') throw new Error('no image');
    if (!out.startsWith('http')) return json({ image: out.replace(/^data:image\/\w+;base64,/, ''), model: FALLBACK });
    // 결과가 주소로 오면 받아서 base64로 넘긴다
    const file = await fetch(out);
    if (!file.ok) throw new Error(`download ${file.status}`);
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return json({ image: btoa(bin), model: FALLBACK });
  } catch (e) {
    return json({ error: 'unexpected upstream response', reason: String(e), detail: secondText.slice(0, 300) }, 502);
  }
});
