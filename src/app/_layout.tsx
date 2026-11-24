import { GowunBatang_400Regular, GowunBatang_700Bold } from '@expo-google-fonts/gowun-batang';
import { NanumPenScript_400Regular } from '@expo-google-fonts/nanum-pen-script';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Intro } from '@/components/Intro';
import { accessToken } from '@/lib/supabase';
import { useCellar } from '@/store';
import { color, paper } from '@/theme';

// 글꼴이 준비될 때까지 종이색 기본 스플래시를 유지한 뒤, 붓글씨 인트로로 넘긴다
SplashScreen.preventAutoHideAsync().catch(() => {});

// 인트로는 앱을 켤 때 한 번만 (레이아웃이 다시 마운트돼도 다시 나오지 않게)
let introPlayed = false;

export default function RootLayout() {
  const [ready] = useFonts({
    GowunBatang_400Regular,
    GowunBatang_700Bold,
    NanumPenScript_400Regular,
    // 그리운X국한박 송글손글 감성 흘림체 — 라이선스 https://www.griun.co.kr/license (폰트 파일 수정 금지)
    SongleSongeul: require('../../assets/fonts/SongleSongeulHeullim.ttf'),
  });
  const [intro, setIntro] = useState(!introPlayed);

  // 첫 촬영 전에 미리 익명 로그인해 둔다 (실패해도 앱은 그대로 쓴다)
  useEffect(() => {
    accessToken().catch(() => {});
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // 처음 실행이면 인트로 다음에 계정 연결 화면을 한 번 보여 준다
  const afterIntro = () => {
    introPlayed = true;
    setIntro(false);
    if (!useCellar.getState().onboarded) router.push('/login');
  };

  if (!ready) return <View style={{ flex: 1, backgroundColor: paper.bg }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: paper.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="cabinet" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="capture"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: color.glass } }}
          />
          <Stack.Screen name="bottle/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="login" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        </Stack>
        {intro && <Intro onDone={afterIntro} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
