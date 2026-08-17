import { Redirect } from 'expo-router';

import { BrandLoader } from '@/components/BrandLoader';
import { useAuth } from '@/context/AuthContext';
import { useCartSession } from '@/context/CartSessionContext';

/**
 * 라우팅 게이트 — 복원된 회원 세션에 따라 알맞은 화면으로 보낸다.
 *  복원 중 → 브랜드 로더 · 미로그인 → /login · 로그인 → /home(허브)
 * 진행 중인 카트가 있어도 홈에서 "쇼핑 계속하기"로 이어가므로 항상 /home으로 보낸다.
 */
export default function IndexGate() {
  const auth = useAuth();
  const session = useCartSession();

  if (auth.isRestoring || session.isRestoring) {
    return <BrandLoader message="로그인 정보를 불러오는 중이에요" />;
  }

  if (!auth.isAuthenticated) return <Redirect href="/login" />;
  return <Redirect href="/home" />;
}
