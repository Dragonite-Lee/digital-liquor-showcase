// 병 사진 → 테마별 그림(수채화·모네·고흐·현대회화). Supabase Edge Function (Deno) → Cloudflare Workers AI (FLUX.2 [klein] 9B).
// 배포: supabase functions deploy illustrate-bottle   (verify_jwt는 supabase/config.toml에서 끔)
// 시크릿: supabase secrets set CF_ACCOUNT_ID=... CF_API_TOKEN=...   (토큰 권한: Workers AI)
const MODEL = Deno.env.get('ILLUSTRATE_MODEL') ?? '@cf/black-forest-labs/flux-2-klein-9b';

// 모든 테마 공통: 병 모양·라벨은 그대로, 배경은 흰색(앱에서 다시 병만 떼어 낸다)
const KEEP = [
  'Keep the exact bottle silhouette, cap, glass color, label layout, label colors and the brand name lettering.',
  'One single bottle, upright, centered, the whole bottle visible from cap to base with some margin.',
  'Plain pure white background. No table, no shadow, no hands, no other objects, no text outside the label.',
].join(' ');

const STYLES: Record<string, string> = {
  watercolor:
    'Redraw the bottle from the input image as a hand-painted watercolor illustration. Fine ink outlines, soft translucent watercolor washes, light pencil texture, gentle color bleeding at the edges, white highlights left as bare paper.',
  monet:
    'Repaint the bottle from the input image as an impressionist oil painting in the manner of Claude Monet. Short broken brushstrokes, soft dappled light, pastel blues, lilacs and warm golds shimmering in the glass, visible canvas texture.',
  vangogh:
    'Repaint the bottle from the input image as a post-impressionist oil painting in the manner of Vincent van Gogh. Thick impasto, bold directional swirling brushstrokes that follow the form of the glass, vivid cobalt blues and chrome yellows, expressive outlines.',
  modern:
    'Redraw the bottle from the input image as a contemporary naive painting with oil pastel and gouache. Chunky hand-drawn rust-brown outline, flat cheerful colors, visible crayon strokes and paper grain, slightly wobbly playful lines, simplified friendly label art.',
};


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

  const form = new FormData();
  form.append('prompt', `${style} ${KEEP}`);
  form.append('input_image_0', new Blob([decode(image)], { type: mediaType }), mediaType === 'image/png' ? 'bottle.png' : 'bottle.jpg');
  form.append('width', '640');
  form.append('height', '1024');

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('workers-ai', res.status, text.slice(0, 300));
    return json({ error: 'illustrator upstream failed', status: res.status, detail: text.slice(0, 300) }, 502);
  }
  try {
    const data = JSON.parse(text);
    const out = data?.result?.image ?? data?.image;
    if (typeof out !== 'string') throw new Error('no image');
    return json({ image: out });
  } catch {
    return json({ error: 'unexpected upstream response', detail: text.slice(0, 300) }, 502);
  }
});
