import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { CartSessionProvider } from '@/context/CartSessionContext';
import { CatalogProvider } from '@/context/CatalogContext';
import { ModeProvider } from '@/context/ModeContext';

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
                  <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="login" options={{ headerShown: false }} />
                    <Stack.Screen name="signup" options={{ headerShown: false }} />
                    <Stack.Screen name="home" options={{ headerShown: false }} />
                    <Stack.Screen name="mypage" options={{ title: '마이페이지' }} />
                    <Stack.Screen name="connect" options={{ title: '카트 연결' }} />
                    <Stack.Screen name="cart" options={{ title: '내 장바구니' }} />
                    <Stack.Screen name="checkout" options={{ title: '결제 확인' }} />
                    <Stack.Screen
                      name="complete"
                      options={{ title: '결제 완료', headerBackVisible: false, gestureEnabled: false }}
                    />
                    <Stack.Screen name="map" options={{ title: '매장 지도' }} />
                    <Stack.Screen name="products" options={{ title: '상품 보기' }} />
                    <Stack.Screen name="product/[id]" options={{ title: '상품 상세' }} />
                    {/* 관리자 영역은 app/admin/_layout.tsx가 권한을 확인하고 자체 Stack을 갖는다. */}
                    <Stack.Screen name="admin" options={{ headerShown: false }} />
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
