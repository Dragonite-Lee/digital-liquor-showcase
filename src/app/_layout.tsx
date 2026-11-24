import { Dokdo_400Regular } from '@expo-google-fonts/dokdo';
import { GowunBatang_400Regular, GowunBatang_700Bold } from '@expo-google-fonts/gowun-batang';
import { NanumPenScript_400Regular } from '@expo-google-fonts/nanum-pen-script';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Intro } from '@/components/Intro';
import { accessToken } from '@/lib/supabase';
import { color, paper } from '@/theme';

// 글꼴이 준비될 때까지 종이색 기본 스플래시를 유지한 뒤, 붓글씨 인트로로 넘긴다
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready] = useFonts({ GowunBatang_400Regular, GowunBatang_700Bold, NanumPenScript_400Regular, Dokdo_400Regular });
  const [intro, setIntro] = useState(true);

  // 첫 촬영 전에 미리 익명 로그인해 둔다 (실패해도 앱은 그대로 쓴다)
  useEffect(() => {
    accessToken().catch(() => {});
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

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
          <Stack.Screen name="bottle/[id]" options={{ presentation: 'modal', contentStyle: { backgroundColor: color.glass } }} />
        </Stack>
        {intro && <Intro onDone={() => setIntro(false)} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
