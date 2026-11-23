// 술병 사진 → { category, name } 분류. Supabase Edge Function (Deno).
// 배포: supabase functions deploy classify-bottle  (verify_jwt는 supabase/config.toml에서 끔)
// 시크릿: supabase secrets set ANTHROPIC_API_KEY=...
import { cors, fetchWithRetry, json, knownCaller } from '../_shared/http.ts';

const MODEL = Deno.env.get('CLASSIFY_MODEL') ?? 'claude-haiku-5-5';
const CATEGORIES = [
  'whisky', 'wine', 'tequila', 'beer', 'sake', 'soju', 'makgeolli',
  'gin', 'rum', 'vodka', 'brandy', 'liqueur', 'champagne', 'etc',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (!knownCaller(req)) return json({ error: 'unknown apikey' }, 401);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not set' }, 500);

  let image: string;
  let mediaType: string;
  try {
    const body = await req.json();
    image = body.image;
    mediaType = body.mediaType ?? 'image/jpeg';
    if (typeof image !== 'string' || image.length < 100) throw new Error('missing image');
    if (image.length > 7_000_000) return json({ error: 'image too large' }, 413);
  } catch {
    return json({ error: 'Body must be { image: base64, mediaType? }' }, 400);
  }

  const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            {
              type: 'text',
              text:
                'This is a photo of a liquor bottle. Identify it and answer with JSON only, no prose: ' +
                `{"category": one of ${JSON.stringify(CATEGORIES)}, "name": "brand and expression, e.g. Macallan 12 Double Cask"}. ` +
                'Use every clue: label text (any language or script), logos, embossing, the cap, and the bottle shape. ' +
                'If the text is partly hidden, blurry or stylised, give your best guess of the brand rather than leaving it empty; ' +
                'omit the age or expression if you cannot read it and give the brand alone. ' +
                'Sparkling wine goes to "champagne". Use name "" only when there is no liquor bottle in the photo.',
            },
          ],
        },
      ],
    }),
  }, { label: 'anthropic' });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    console.error('anthropic', res.status, detail);
    return json({ error: 'classifier upstream failed', status: res.status, detail }, 502);
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  try {
    const parsed = JSON.parse(match ? match[0] : text);
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : 'etc';
    const name = typeof parsed.name === 'string' ? parsed.name.slice(0, 80) : '';
    // 이름을 못 읽었으면 원인을 보려고 모델 답을 같이 돌려준다 (앱은 개발 빌드에서만 보여 준다)
    return json(name ? { category, name } : { category, name, raw: text.slice(0, 200) });
  } catch {
    return json({ category: 'etc', name: '', raw: text.slice(0, 200) });
  }
});
