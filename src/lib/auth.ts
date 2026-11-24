import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { accessToken, authHeaders, supabase } from './supabase';

// 로그인은 "지금 쓰는 익명 사용자에 Apple·Google 계정을 연결"한다. 사용자 id가 그대로라 산 테마·기록이 이어진다.
// 그 계정이 이미 다른 사용자(예: 예전 폰)에 연결돼 있으면, 그 사용자로 갈아탄다.

export type Provider = 'apple' | 'google';
export type Account = { linked: false } | { linked: true; providers: Provider[]; email?: string };

const REDIRECT = Linking.createURL('auth-callback');

export class AuthCancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

/** 지금 사용자가 어떤 계정에 연결돼 있는지 */
export async function currentAccount(): Promise<Account> {
  if (!supabase) return { linked: false };
  await accessToken();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) return { linked: false };
  const providers = (user.identities ?? [])
    .map((i) => i.provider)
    .filter((p): p is Provider => p === 'apple' || p === 'google');
  return { linked: true, providers, email: user.email ?? undefined };
}

/** Apple 로그인 버튼을 보여 줄지 (iOS 13+ 기기에서만) */
export async function appleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

function need() {
  if (!supabase) throw new Error('서버 설정이 없어요 (.env 확인)');
  return supabase;
}

/** Apple: 기기의 Apple 로그인 시트 → ID 토큰을 Supabase에 넘긴다 */
export async function signInWithApple(): Promise<void> {
  const client = need();
  await accessToken(); // 익명 세션이 있어야 그 사용자에 연결된다
  const rawNonce = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new AuthCancelled();
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple에서 토큰을 받지 못했어요');

  const params = { provider: 'apple' as const, token: credential.identityToken, nonce: rawNonce };
  const linked = await client.auth.linkIdentity(params);
  if (!linked.error) return;
  if (linked.error.code === 'identity_already_exists') {
    const signed = await client.auth.signInWithIdToken(params);
    if (signed.error) throw signed.error;
    return;
  }
  throw linked.error;
}

/** 브라우저 로그인 창을 열고, 돌아온 주소의 코드로 세션을 만든다 (PKCE) */
async function browserFlow(url: string): Promise<'ok' | 'already_linked'> {
  const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT);
  if (result.type !== 'success') throw new AuthCancelled();
  const { queryParams } = Linking.parse(result.url);
  // 오류는 쿼리나 # 뒤에 붙어 온다
  const hash = new URLSearchParams(result.url.split('#')[1] ?? '');
  const errorCode = String(queryParams?.error_code ?? hash.get('error_code') ?? '');
  if (errorCode === 'identity_already_exists') return 'already_linked';
  const code = queryParams?.code;
  if (typeof code !== 'string') {
    const message = queryParams?.error_description ?? hash.get('error_description') ?? '로그인 응답이 올바르지 않아요';
    throw new Error(String(message));
  }
  const { error } = await need().auth.exchangeCodeForSession(code);
  if (error) throw error;
  return 'ok';
}

/** Google: Supabase Google 로그인 창(브라우저) — iOS·Android 같은 방식 */
export async function signInWithGoogle(): Promise<void> {
  const client = need();
  await accessToken();
  const options = { redirectTo: REDIRECT, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } };
  const link = await client.auth.linkIdentity({ provider: 'google', options });
  if (link.error) throw link.error;
  const outcome = await browserFlow(link.data.url);
  if (outcome === 'ok') return;
  // 이 Google 계정은 이미 다른 사용자 것 → 그 사용자로 로그인
  const signIn = await client.auth.signInWithOAuth({ provider: 'google', options });
  if (signIn.error) throw signIn.error;
  if ((await browserFlow(signIn.data.url)) !== 'ok') throw new Error('Google 로그인에 실패했어요');
}

/** 계정과 서버 데이터를 지운다. 기기에 담긴 병은 그대로 두고, 새 익명 사용자로 다시 시작한다. */
export async function deleteAccount(): Promise<void> {
  const client = need();
  const url = process.env.EXPO_PUBLIC_CLASSIFY_URL?.replace(/classify-bottle$/, 'delete-account');
  if (!url) throw new Error('서버 주소가 없어요');
  const res = await fetch(url, { method: 'POST', headers: await authHeaders() });
  if (!res.ok) throw new Error(`계정을 지우지 못했어요 (${res.status})`);
  await client.auth.signOut({ scope: 'local' });
  await accessToken();
}
