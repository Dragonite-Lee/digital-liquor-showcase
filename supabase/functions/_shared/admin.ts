// 함수 안에서만 쓰는 관리자(secret 키) 클라이언트. RLS를 건너뛰므로 앱에 절대 내보내지 않는다.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** 함수 환경의 secret 키 (JSON 객체 또는 문자열), 없으면 예전 service_role 키 */
export function secretKey(): string | undefined {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const first = typeof parsed === 'string' ? parsed : Object.values(parsed ?? {})[0];
      if (typeof first === 'string' && first) return first;
    } catch {
      if (raw.trim()) return raw.trim();
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}

// deno-lint-ignore no-explicit-any
export type Admin = SupabaseClient<any, any, any>;

/** 키나 주소가 없으면 undefined */
export function adminClient(): Admin | undefined {
  const url = Deno.env.get('SUPABASE_URL');
  const key = secretKey();
  if (!url || !key) return undefined;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
