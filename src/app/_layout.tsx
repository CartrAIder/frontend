import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { CartSessionProvider } from '@/context/CartSessionContext';
import { CatalogProvider } from '@/context/CatalogContext';
import { ModeProvider } from '@/context/ModeContext';

/**
 * 루트 레이아웃.
 *
 * 네이티브 헤더는 전부 끈다. 화면마다 `components/AppBar` 를 직접 그리는데, 네이티브
 * 헤더까지 켜면 상단 여백이 두 번 잡혀 화면이 아래로 밀린다.
 *
 * 전환은 가로 슬라이드(`slide_from_right`)로 통일해 탭을 옮길 때도 옆으로 넘어가는
 * 느낌이 나게 했다.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ModeProvider>
          <AuthProvider>
            <CatalogProvider>
              <CartSessionProvider>
                <CartProvider>
                  <StatusBar style="auto" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: 'slide_from_right',
                      animationDuration: 220,
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="signup" />
                    <Stack.Screen name="password-reset" />
                    {/* 탭 화면은 TabTransition 이 직접 좌/우 슬라이드를 그린다 */}
                    <Stack.Screen name="home" options={{ animation: 'none' }} />
                    {/* 탭 화면은 TabTransition 이 직접 좌/우 슬라이드를 그린다 */}
                    <Stack.Screen name="mypage" options={{ animation: 'none' }} />
                    <Stack.Screen name="password-change" />
                    <Stack.Screen name="withdraw" />
                    <Stack.Screen name="connect" />
                    {/* 탭 화면은 TabTransition 이 직접 좌/우 슬라이드를 그린다 */}
                    <Stack.Screen name="cart" options={{ animation: 'none' }} />
                    <Stack.Screen name="checkout" />
                    <Stack.Screen name="complete" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="map" />
                    {/* 탭 화면은 TabTransition 이 직접 좌/우 슬라이드를 그린다 */}
                    <Stack.Screen name="products" options={{ animation: 'none' }} />
                    <Stack.Screen name="product/[id]" />
                    {/* 관리자 영역은 app/admin/_layout.tsx가 권한을 확인하고 자체 Stack을 갖는다. */}
                    <Stack.Screen name="admin" />
                  </Stack>
                </CartProvider>
              </CartSessionProvider>
            </CatalogProvider>
          </AuthProvider>
        </ModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
