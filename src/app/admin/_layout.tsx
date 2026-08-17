import { Redirect, Stack } from 'expo-router';

import { BrandLoader } from '@/components/BrandLoader';
import { useAuth } from '@/context/AuthContext';

/**
 * 관리자 영역 라우트 가드.
 * 홈의 관리자 버튼은 admin 계정에만 보이지만, 딥링크·뒤로가기로도 들어올 수 있으므로
 * 여기서 한 번 더 막는다. 로그인 안 했으면 /login, 일반 회원이면 /home으로 되돌린다.
 */
export default function AdminLayout() {
  const { isAuthenticated, isAdmin, isRestoring } = useAuth();

  if (isRestoring) return <BrandLoader message="권한을 확인하는 중이에요" />;
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (!isAdmin) return <Redirect href="/home" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 220 }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="products" />
      <Stack.Screen name="product-form" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="order/[orderId]" />
      <Stack.Screen name="map" />
    </Stack>
  );
}
