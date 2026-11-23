// Google Gemini API 직접 호출 (Cloudflare 5% 수수료 없음). 사용량이 늘면 전환한다.
// 시크릿: GOOGLE_API_KEY (Google AI Studio, 결제 등록 필요) · 선택: GOOGLE_IMAGE_MODEL
// 켜기: supabase secrets set ART_PROVIDER=google   (테마별: ART_PROVIDER_MONET=google)
import { fetchWithRetry } from '../../_shared/http.ts';
import { type ArtProvider, ProviderError } from './types.ts';

const MODEL = Deno.env.get('GOOGLE_IMAGE_MODEL') ?? 'gemini-2.5-flash-image';

/** generateContent 응답에서 이미지 base64를 꺼낸다. 막혔으면 이유를 돌려준다. */
export function pickGeminiImage(data: unknown): { image: string } | { blocked: string } | null {
  // deno-lint-ignore no-explicit-any
  const d = data as any;
  const blocked = d?.promptFeedback?.blockReason;
  if (blocked) return { blocked: String(blocked) };
  const candidate = d?.candidates?.[0];
  // deno-lint-ignore no-explicit-any
  const part = candidate?.content?.parts?.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
  const image = part?.inlineData?.data ?? part?.inline_data?.data;
  if (typeof image === 'string') return { image };
  const reason = candidate?.finishReason;
  if (reason && reason !== 'STOP') return { blocked: String(reason) };
  return null;
}

export function google(): ArtProvider {
  const key = Deno.env.get('GOOGLE_API_KEY');
  return {
    id: 'google',
    async generate(input) {
      if (!key) throw new ProviderError('config', 500, 'GOOGLE_API_KEY is not set');
      const res = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: input.prompt }, { inline_data: { mime_type: input.mediaType, data: input.image } }],
              },
            ],
            generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '2:3' } },
          }),
        },
        { label: 'google' },
      );
      const text = await res.text();
      if (!res.ok) {
        throw new ProviderError(res.status === 401 || res.status === 403 ? 'config' : 'upstream', res.status, text.slice(0, 300));
      }
      let picked: ReturnType<typeof pickGeminiImage> = null;
      try {
        picked = pickGeminiImage(JSON.parse(text));
      } catch {
        // 아래에서 처리
      }
      if (!picked) throw new ProviderError('upstream', 502, `no image: ${text.slice(0, 300)}`);
      if ('blocked' in picked) throw new ProviderError('flagged', 422, picked.blocked);
      return { image: picked.image, model: MODEL };
    },
  };
}
