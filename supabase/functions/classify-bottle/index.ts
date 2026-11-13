// 술병 사진 → { category, name } 분류. Supabase Edge Function (Deno).
// 배포: supabase functions deploy classify-bottle  (verify_jwt는 supabase/config.toml에서 끔)
// 시크릿: supabase secrets set ANTHROPIC_API_KEY=...
const MODEL = Deno.env.get('CLASSIFY_MODEL') ?? 'claude-haiku-5-5';
const CATEGORIES = [
  'whisky', 'wine', 'tequila', 'beer', 'sake', 'soju', 'makgeolli',
  'gin', 'rum', 'vodka', 'brandy', 'liqueur', 'champagne', 'etc',
];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  // 이 프로젝트의 publishable 키를 들고 온 요청만 받는다 (키 자체는 공개값이라 남용을 완전히 막지는 못한다)
  const caller = req.headers.get('apikey') ?? '';
  const known = `${Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? ''} ${Deno.env.get('SUPABASE_ANON_KEY') ?? ''}`;
  if (caller.length < 20 || !known.includes(caller)) return json({ error: 'unknown apikey' }, 401);

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

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            {
              type: 'text',
              text:
                'This is a photo of a liquor bottle. Read the label and answer with JSON only, no prose: ' +
                `{"category": one of ${JSON.stringify(CATEGORIES)}, "name": "brand and expression as printed on the label, e.g. Macallan 12 Double Cask"}. ` +
                'Sparkling wine goes to "champagne". If it is not a liquor bottle or the label is unreadable, use category "etc" and name "".',
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) return json({ error: 'classifier upstream failed', status: res.status }, 502);

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  try {
    const parsed = JSON.parse(match ? match[0] : text);
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : 'etc';
    const name = typeof parsed.name === 'string' ? parsed.name.slice(0, 80) : '';
    return json({ category, name });
  } catch {
    return json({ category: 'etc', name: '' });
  }
});
