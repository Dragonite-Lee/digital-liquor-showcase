import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/** 예전 .env(분류 주소·키만 있는 것)도 그대로 쓰도록 분류 주소에서 프로젝트 주소를 뽑는다. */
function projectUrl(): string | undefined {
  const direct = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (direct) return direct;
  const classify = process.env.EXPO_PUBLIC_CLASSIFY_URL;
  const match = classify?.match(/^(https:\/\/[^/]+)\/functions\/v1\//);
  return match?.[1];
}

const URL = projectUrl();
const KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_CLASSIFY_KEY;

/** 주소·키가 없으면(웹 미리보기 등) null — 서버 기능 없이 기기 안에서만 돈다. */
export const supabase: SupabaseClient | null =
  URL && KEY
    ? createClient(URL, KEY, {
        auth: {
          ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          // Google 로그인은 브라우저에서 돌아온 코드로 세션을 만든다
          flowType: 'pkce',
        },
      })
    : null;

// 앱이 앞에 있을 때만 토큰을 갱신한다 (Supabase 권장)
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

let pending: Promise<string | null> | null = null;

/**
 * 로그인된 사용자의 access token. 처음이면 익명 로그인한다 (가입 화면 없음).
 * 동시에 여러 번 불려도 로그인은 한 번만 한다. 실패하면 null — 호출하는 쪽에서 서버 기능을 건너뛴다.
 */
export function accessToken(): Promise<string | null> {
  if (!supabase) return Promise.resolve(null);
  pending ??= (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session.access_token;
      const signed = await supabase.auth.signInAnonymously();
      if (signed.error) {
        console.warn('[auth] 익명 로그인 실패', signed.error.message);
        return null;
      }
      return signed.data.session?.access_token ?? null;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

/** 함수 호출에 붙이는 헤더: apikey(프로젝트) + Authorization(사용자) */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await accessToken();
  return {
    ...(KEY ? { apikey: KEY } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** 지금 사용자 id (서버 기록·저장소 경로용). 로그인 전이면 null */
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  await accessToken();
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
