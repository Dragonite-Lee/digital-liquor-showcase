// Cloudflare 경유 (AI Gateway 통합 결제). 기본은 Google 나노바나나, 원하면 FLUX.2 klein을 먼저 시도한다.
// 시크릿: CF_ACCOUNT_ID, CF_API_TOKEN · 선택: CF_GATEWAY_ID, ILLUSTRATE_FALLBACK, ILLUSTRATE_MODEL, ILLUSTRATE_TRY_FLUX=1
import { base64ToBytes, bytesToBase64, fetchWithRetry } from '../../_shared/http.ts';
import { type ArtInput, type ArtOutput, type ArtProvider, ProviderError } from './types.ts';

const FLUX = Deno.env.get('ILLUSTRATE_MODEL') ?? '@cf/black-forest-labs/flux-2-klein-9b';
const MODEL = Deno.env.get('ILLUSTRATE_FALLBACK') ?? 'google/nano-banana';
const GATEWAY = Deno.env.get('CF_GATEWAY_ID') ?? 'default';
// 라벨 있는 병은 FLUX 안전 필터에 거의 다 막혀서 기본은 건너뛴다
const TRY_FLUX = Deno.env.get('ILLUSTRATE_TRY_FLUX') === '1';

/** 응답에서 이미지(base64 또는 주소)를 꺼낸다. { result: { result: { image } } }처럼 한 겹 더 감싸여 오기도 한다. */
export function pickImage(data: unknown): string | null {
  // deno-lint-ignore no-explicit-any
  const d = data as any;
  const out = d?.result?.result?.image ?? d?.result?.image ?? d?.image;
  return typeof out === 'string' ? out : null;
}

async function toBase64(out: string): Promise<string> {
  if (!out.startsWith('http')) return out.replace(/^data:image\/\w+;base64,/, '');
  const file = await fetchWithRetry(out, {}, { label: 'cf-download' });
  if (!file.ok) throw new ProviderError('upstream', file.status, `download ${file.status}`);
  return bytesToBase64(new Uint8Array(await file.arrayBuffer()));
}

export function cloudflare(): ArtProvider {
  const account = Deno.env.get('CF_ACCOUNT_ID');
  const token = Deno.env.get('CF_API_TOKEN');
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run`;

  async function flux(input: ArtInput): Promise<ArtOutput | null> {
    const form = new FormData();
    form.append('prompt', input.prompt);
    form.append('input_image_0', new Blob([base64ToBytes(input.image)], { type: input.mediaType }), input.mediaType === 'image/png' ? 'bottle.png' : 'bottle.jpg');
    form.append('width', '640');
    form.append('height', '1024');
    form.append('seed', String(Math.floor(Math.random() * 2_000_000_000)));
    const res = await fetchWithRetry(
      `${base}/${FLUX}`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'cf-aig-gateway-id': GATEWAY }, body: form },
      { label: 'cf-flux', attempts: 2 },
    );
    const text = await res.text();
    if (res.status === 401 || res.status === 403) throw new ProviderError('config', res.status, text.slice(0, 300));
    if (res.ok) {
      try {
        const out = pickImage(JSON.parse(text));
        if (out) return { image: await toBase64(out), model: FLUX };
      } catch {
        // 아래 기본 모델로
      }
    }
    console.error('cf-flux', res.status, text.slice(0, 300));
    return null;
  }

  return {
    id: 'cloudflare',
    async generate(input) {
      if (!account || !token) throw new ProviderError('config', 500, 'CF_ACCOUNT_ID / CF_API_TOKEN is not set');
      if (TRY_FLUX) {
        const first = await flux(input);
        if (first) return first;
      }
      const res = await fetchWithRetry(
        base,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'cf-aig-gateway-id': GATEWAY },
          body: JSON.stringify({
            model: MODEL,
            input: {
              prompt: input.prompt,
              image_input: [`data:${input.mediaType};base64,${input.image}`],
              aspect_ratio: '2:3',
              output_format: 'png',
              image_size: '1K',
            },
          }),
        },
        { label: 'cf-run' },
      );
      const text = await res.text();
      if (!res.ok) {
        const code = /flagged|safety|blocked/i.test(text) ? 'flagged' : res.status === 401 || res.status === 403 ? 'config' : 'upstream';
        throw new ProviderError(code, res.status, text.slice(0, 300));
      }
      let out: string | null = null;
      try {
        out = pickImage(JSON.parse(text));
      } catch {
        // 아래에서 처리
      }
      if (!out) throw new ProviderError('upstream', 502, `no image: ${text.slice(0, 300)}`);
      return { image: await toBase64(out), model: MODEL };
    },
  };
}
