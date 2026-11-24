// 병 사진 → 테마별 그림(수채화·모네·고흐·크레용). Supabase Edge Function (Deno).
// 배포: supabase functions deploy illustrate-bottle   (verify_jwt는 끄고 함수 안에서 사용자 토큰을 검증한다)
// 모델 선택: providers/index.ts (기본 Cloudflare 경유 나노바나나, ART_PROVIDER=google로 직접 호출)
import { adminClient } from '../_shared/admin.ts';
import { requireUser } from '../_shared/auth.ts';
import { cors, json } from '../_shared/http.ts';
import { dbLedger, illustrate } from './ledger.ts';
import { DEFAULT_STYLES } from './prompts.ts';
import { ProviderError, providerFor } from './providers/index.ts';

// 모든 테마 뒤에 붙이는 공통 지시. 테마 프롬프트에 이미 들어 있어 짧게 둔다.
const KEEP =
  Deno.env.get('PROMPT_KEEP') ??
  'Reminder: exactly one bottle, upright and fully visible, on a flat plain pure white background with nothing else.';

// 프롬프트는 코드 수정 없이 Supabase 시크릿으로 바꿀 수 있다 (PROMPT_WATERCOLOR, PROMPT_MONET, PROMPT_VANGOGH, PROMPT_MODERN, PROMPT_KEEP)
const STYLES: Record<string, string> = Object.fromEntries(
  Object.entries(DEFAULT_STYLES).map(([id, text]) => [id, Deno.env.get(`PROMPT_${id.toUpperCase()}`) ?? text]),
);

/** 앱은 512px로 줄여 보낸다. 이보다 크면 비정상 요청으로 본다. */
const MAX_IMAGE = 3_000_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  // 익명 로그인 포함, 로그인한 사용자만 (사용량 한도·구매 확인의 기준이 된다)
  const caller = await requireUser(req);
  if (caller instanceof Response) return caller;

  let image: string;
  let mediaType: string;
  let theme: string;
  let bottleId: string;
  let redraw: boolean;
  try {
    const body = await req.json();
    image = body.image;
    mediaType = body.mediaType ?? 'image/jpeg';
    theme = typeof body.theme === 'string' && body.theme in STYLES ? body.theme : 'watercolor';
    bottleId = typeof body.bottleId === 'string' && body.bottleId ? body.bottleId.slice(0, 64) : 'unknown';
    redraw = body.redraw === true;
    if (typeof image !== 'string' || image.length < 100) throw new Error('missing image');
  } catch {
    return json({ error: 'Body must be { image: base64, mediaType?, theme?, bottleId?, redraw? }' }, 400);
  }
  if (image.length > MAX_IMAGE) return json({ error: 'image too large' }, 413);

  const admin = adminClient();
  if (!admin) return json({ error: 'server not configured' }, 500);

  const provider = providerFor(theme);
  try {
    const result = await illustrate(
      dbLedger(admin),
      { id: provider.id, draw: () => provider.generate({ image, mediaType, prompt: `${STYLES[theme]} ${KEEP}` }) },
      { userId: caller.id, image, mediaType, theme, bottleId, redraw },
    );
    console.log('art', caller.id, theme, provider.id, result.kind);
    if (result.kind === 'limit') return json({ error: 'daily_limit', limit: result.limit }, 429);
    if (result.kind === 'cached') return json({ image: result.image, cached: true });
    return json({ image: result.image, model: result.model, provider: provider.id, used: result.used });
  } catch (e) {
    if (e instanceof ProviderError) {
      console.error(provider.id, caller.id, e.code, e.status, e.detail);
      const status = e.code === 'flagged' ? 422 : e.code === 'config' ? 500 : 502;
      return json({ error: e.code, status: e.status, detail: e.detail }, status);
    }
    console.error(provider.id, e);
    return json({ error: 'upstream', detail: String(e) }, 502);
  }
});
