import { GowunBatang_400Regular, GowunBatang_700Bold } from '@expo-google-fonts/gowun-batang';
import { NanumPenScript_400Regular } from '@expo-google-fonts/nanum-pen-script';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { accessToken } from '@/lib/supabase';
import { color } from '@/theme';

export default function RootLayout() {
  const [ready] = useFonts({ GowunBatang_400Regular, GowunBatang_700Bold, NanumPenScript_400Regular });
  // 첫 촬영 전에 미리 익명 로그인해 둔다 (실패해도 앱은 그대로 쓴다)
  useEffect(() => {
    accessToken().catch(() => {});
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: color.glass }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.glass } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="cabinet" options={{ animation: 'fade' }} />
        <Stack.Screen name="capture" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="bottle/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
