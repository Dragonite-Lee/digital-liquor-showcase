// 사용자 확인: 앱이 보낸 Authorization: Bearer <access token>을 검증해 사용자 id를 얻는다.
// 플랫폼의 verify_jwt는 새 API 키·서명 키와 맞지 않는 경우가 있어 끄고(config.toml), 여기서 직접 검증한다.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { json } from './http.ts';

export type Caller = { id: string; anonymous: boolean };
export type Verify = (token: string) => Promise<{ sub?: string; is_anonymous?: boolean } | null>;

/** 함수 환경에 들어 있는 publishable 키 하나 (JSON 객체 또는 문자열), 없으면 예전 anon 키 */
export function publishableKey(env = (k: string) => Deno.env.get(k)): string | undefined {
  const raw = env('SUPABASE_PUBLISHABLE_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const first = typeof parsed === 'string' ? parsed : Object.values(parsed ?? {})[0];
      if (typeof first === 'string' && first) return first;
    } catch {
      if (raw.trim()) return raw.trim();
    }
  }
  return env('SUPABASE_ANON_KEY');
}

let client: ReturnType<typeof createClient> | null = null;

/** 기본 검증: getClaims — 비대칭 키는 JWKS로, 대칭 키는 Auth 서버에 물어 검증한다 */
const defaultVerify: Verify = async (token) => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = publishableKey();
  if (!url || !key) throw new Error('SUPABASE_URL / publishable key missing');
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims as { sub?: string; is_anonymous?: boolean };
};

export function bearer(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  // publishable 키(sb_publishable_...)는 사용자 토큰이 아니다
  if (!token || token.startsWith('sb_')) return null;
  return token;
}

/** 로그인한 사용자(익명 포함)만 통과. 아니면 401 응답을 돌려준다. */
export async function requireUser(req: Request, verify: Verify = defaultVerify): Promise<Caller | Response> {
  const token = bearer(req);
  if (!token) return json({ error: 'login required' }, 401);
  try {
    const claims = await verify(token);
    if (!claims?.sub) return json({ error: 'invalid token' }, 401);
    return { id: claims.sub, anonymous: claims.is_anonymous === true };
  } catch (e) {
    console.error('[auth]', e);
    return json({ error: 'auth check failed' }, 500);
  }
}
