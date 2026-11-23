import { cloudflare } from './cloudflare.ts';
import { google } from './google.ts';
import type { ArtProvider } from './types.ts';

const FACTORIES: Record<string, () => ArtProvider> = { cloudflare, google };

/**
 * 테마에 쓸 모델을 고른다. ART_PROVIDER_<THEME> → ART_PROVIDER → cloudflare 순.
 * 새 모델(예: Comfy Cloud)은 providers/에 파일 하나 추가하고 여기 등록하면 된다.
 */
export function providerFor(theme: string, env = (k: string) => Deno.env.get(k)): ArtProvider {
  const id = env(`ART_PROVIDER_${theme.toUpperCase()}`) ?? env('ART_PROVIDER') ?? 'cloudflare';
  const make = FACTORIES[id];
  if (!make) {
    console.warn(`[providers] 모르는 ART_PROVIDER "${id}" — cloudflare로 대신한다`);
    return cloudflare();
  }
  return make();
}

export { ProviderError } from './types.ts';
