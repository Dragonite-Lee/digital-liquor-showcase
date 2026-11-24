import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  type Account,
  AuthCancelled,
  appleAvailable,
  currentAccount,
  deleteAccount,
  type Provider,
  signInWithApple,
  signInWithGoogle,
} from '@/lib/auth';
import { useCellar } from '@/store';
import { font, paper, space } from '@/theme';

const PAPER = require('../../assets/ui/paper.png');
const ART = require('../../assets/icon.png');
const NAMES: Record<Provider, string> = { apple: 'Apple', google: 'Google' };

/**
 * 계정 연결: iOS는 Apple·Google, Android는 Google.
 * 처음 실행 때 한 번 뜨고(나중에 하기 가능), 홈 오른쪽 위 계정 버튼으로 다시 연다.
 */
export default function Login() {
  const insets = useSafeAreaInsets();
  const markOnboarded = useCellar((s) => s.markOnboarded);
  const [apple, setApple] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [busy, setBusy] = useState<Provider | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    appleAvailable().then(setApple);
    currentAccount()
      .then(setAccount)
      .catch(() => setAccount({ linked: false }));
  }, []);

  const close = () => {
    markOnboarded();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const run = async (provider: Provider) => {
    setError(null);
    setBusy(provider);
    try {
      await (provider === 'apple' ? signInWithApple() : signInWithGoogle());
      setAccount(await currentAccount());
      markOnboarded();
    } catch (e) {
      if (!(e instanceof AuthCancelled)) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = () =>
    Alert.alert('계정을 삭제할까요?', '연결된 계정과 서버에 있는 기록·구매 정보가 지워져요. 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          setError(null);
          try {
            await deleteAccount();
            setAccount({ linked: false });
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.l, paddingBottom: insets.bottom + space.l }]}>
      <Image source={PAPER} style={StyleSheet.absoluteFill} contentFit="cover" />

      <View style={styles.top}>
        <Text style={styles.title} accessibilityRole="header">
          호가술병
        </Text>
        {account?.linked ? (
          <Text style={styles.body}>
            {account.providers.map((p) => NAMES[p]).join(' · ') || '계정'}에 연결돼 있어요
            {account.email ? `\n${account.email}` : ''}
          </Text>
        ) : (
          <Text style={styles.body}>계정을 연결해 두면{'\n'}폰을 바꿔도 이어서 쓸 수 있어요</Text>
        )}
      </View>

      <Image source={ART} style={styles.art} contentFit="contain" accessible={false} />

      <View style={styles.actions}>
        {account === null ? (
          <ActivityIndicator color={paper.ink} />
        ) : account.linked ? (
          <>
            <Pressable onPress={close} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryLabel}>확인</Text>
            </Pressable>
            <Pressable onPress={confirmDelete} disabled={busy !== null} accessibilityRole="button" hitSlop={10}>
              {busy === 'delete' ? <ActivityIndicator color={paper.inkSoft} /> : <Text style={styles.delete}>계정 삭제</Text>}
            </Pressable>
          </>
        ) : (
          <>
            {apple && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14}
                style={[styles.apple, busy !== null && styles.dim]}
                onPress={() => busy === null && run('apple')}
              />
            )}
            <Pressable
              onPress={() => run('google')}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel="Google로 계속하기"
              style={({ pressed }) => [styles.google, (pressed || (busy !== null && busy !== 'google')) && styles.pressed]}
            >
              {busy === 'google' ? (
                <ActivityIndicator color={paper.ink} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color={paper.ink} />
                  <Text style={styles.googleLabel}>Google로 계속하기</Text>
                </>
              )}
            </Pressable>
            <Pressable onPress={close} accessibilityRole="button" hitSlop={12} style={styles.later}>
              <Text style={styles.laterLabel}>나중에 할게요</Text>
            </Pressable>
          </>
        )}
        {busy === 'apple' && <ActivityIndicator color={paper.ink} />}
        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: paper.bg, paddingHorizontal: space.xl, justifyContent: 'space-between' },
  top: { marginTop: '14%', alignItems: 'center', gap: space.m },
  art: { alignSelf: 'center', width: 230, height: 230, borderRadius: 40, opacity: 0.95 },
  title: { fontFamily: font.hand, fontSize: 44, color: paper.ink },
  body: { fontFamily: font.hand, fontSize: 19, lineHeight: 27, color: paper.ink, textAlign: 'center' },
  actions: { gap: space.m, alignItems: 'stretch' },
  apple: { height: 52, width: '100%' },
  google: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFDF9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(58,47,42,0.35)',
  },
  googleLabel: { fontSize: 17, fontWeight: '600', color: paper.ink },
  primary: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: paper.ink },
  primaryLabel: { fontSize: 17, fontWeight: '600', color: paper.bg },
  later: { alignSelf: 'center', paddingVertical: space.xs },
  laterLabel: { fontFamily: font.hand, fontSize: 18, color: paper.inkSoft },
  delete: { alignSelf: 'center', fontSize: 14, color: paper.inkSoft, textDecorationLine: 'underline' },
  error: { textAlign: 'center', fontSize: 13, color: '#9A3B2E' },
  pressed: { opacity: 0.6 },
  dim: { opacity: 0.5 },
});
