import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { initSeedDataIfNeeded } from '@/src/lib/seed';
import { deduplicateSessions } from '@/src/lib/storage';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      initSeedDataIfNeeded(); // 初回起動のみ種目・テンプレートを投入
      deduplicateSessions();  // 同日の重複セッションを削除
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // Web: NativeStackNavigator が LinkingContext を要求して落ちるため Slot で回避
  // Native: Stack（ネイティブスタックナビゲーター）を使用
  if (Platform.OS === 'web') {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Slot />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerTitleAlign: 'center', headerShadowVisible: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="template/index" options={{ title: 'メニューの編集', headerBackTitle: '設定' }} />
        <Stack.Screen name="template/[id]" options={{ title: 'メニュー', headerBackTitle: 'メニューの編集' }} />
        <Stack.Screen name="template/pick-exercise" options={{ title: '種目を選択', headerBackTitle: '戻る' }} />
        <Stack.Screen name="history/[id]" options={{ title: '履歴詳細', headerBackTitle: '履歴' }} />
        <Stack.Screen name="workout/[date]" options={{ title: '', headerBackTitle: '戻る' }} />
        <Stack.Screen name="workout/add-exercise" options={{ title: '種目を選択', headerBackTitle: '筋トレ' }} />
        <Stack.Screen name="exercise/index" options={{ title: '種目の編集', headerBackTitle: '設定' }} />
        <Stack.Screen name="exercise/[id]" options={{ title: '種目を編集', headerBackTitle: '種目の編集' }} />
        <Stack.Screen name="pr-exercises/index" options={{ title: '自己記録の編集', headerBackTitle: '設定' }} />
        <Stack.Screen name="category/index" options={{ title: '部位の編集', headerBackTitle: '設定' }} />
        <Stack.Screen name="category/add" options={{ title: '部位を追加', headerBackTitle: '部位の編集' }} />
        <Stack.Screen name="category/[name]" options={{ title: '部位を編集', headerBackTitle: '部位の編集' }} />
        <Stack.Screen name="exercise-history/[name]" options={{ title: '過去の記録', headerBackTitle: '戻る' }} />
      </Stack>
    </ThemeProvider>
  );
}
