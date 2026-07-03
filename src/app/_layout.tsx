import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ModeProvider } from '@/context/ModeContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ModeProvider>
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen name="index" options={{ title: '카트 연결' }} />
            <Stack.Screen name="cart" options={{ title: '내 장바구니' }} />
            <Stack.Screen name="checkout" options={{ title: '결제 확인' }} />
            <Stack.Screen name="complete" options={{ title: '결제 완료' }} />
            <Stack.Screen name="navigate" options={{ title: '매장 길 안내' }} />
          </Stack>
        </ModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
