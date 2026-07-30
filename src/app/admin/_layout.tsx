import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';

/**
 * 관리자 영역 라우트 가드.
 * 홈의 관리자 버튼은 admin 계정에만 보이지만, 딥링크·뒤로가기로도 들어올 수 있으므로
 * 여기서 한 번 더 막는다. 로그인 안 했으면 /login, 일반 회원이면 /home으로 되돌린다.
 */
export default function AdminLayout() {
  const { isAuthenticated, isAdmin, isRestoring } = useAuth();

  if (isRestoring) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (!isAdmin) return <Redirect href="/home" />;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '관리자 페이지' }} />
      <Stack.Screen name="products" options={{ title: '상품 관리' }} />
      <Stack.Screen name="product-form" options={{ title: '상품 등록' }} />
      <Stack.Screen name="map" options={{ title: '매장 지도 편집' }} />
    </Stack>
  );
}
