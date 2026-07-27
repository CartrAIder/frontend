/**
 * 카트 세션 상태 — QR/코드로 연결한 카트 하나.
 *
 * 회원 로그인(AuthContext)과는 독립적으로, "지금 어떤 카트에 연결되어 있는가"만 관리한다.
 * 연결된 cartId는 secure-store에 저장되어 앱을 나갔다 돌아와도 복원된다(쇼핑 이어하기).
 *
 * 리셋 캐스케이드: AuthProvider 안쪽에 중첩되어 회원 로그아웃을 감지하면
 * 카트 세션도 함께 종료한다. 카트 세션이 닫히면 다시 CartProvider가 이를 감지해
 * 장바구니를 비운다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/context/AuthContext';
import { connectCart, disconnectCart } from '@/lib/api';
import { clearCartId, loadCartId, saveCartId } from '@/lib/cartStorage';

interface CartSessionValue {
  cartId: string | null;
  isConnected: boolean;
  isRestoring: boolean;
  connect: (code: string) => Promise<void>;
  endSession: () => void;
}

const CartSessionContext = createContext<CartSessionValue | undefined>(undefined);

export function CartSessionProvider({ children }: { children: ReactNode }) {
  const [cartId, setCartId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const { isRestoring: authRestoring, isAuthenticated } = useAuth();
  // endSession이 항상 최신 cartId를 참조하도록(콜백 identity는 안정 유지) ref 사용.
  const cartIdRef = useRef<string | null>(null);
  cartIdRef.current = cartId;

  useEffect(() => {
    loadCartId()
      .then(setCartId)
      .finally(() => setIsRestoring(false));
  }, []);

  const connect = useCallback(async (code: string) => {
    const { cartId: connectedId } = await connectCart(code);
    setCartId(connectedId);
    await saveCartId(connectedId);
  }, []);

  const endSession = useCallback(() => {
    const id = cartIdRef.current;
    setCartId(null);
    clearCartId().catch(() => {
      // 삭제 실패는 무시 — 메모리 상 상태는 이미 초기화됨.
    });
    // 서버 점유 해제(best-effort) — 실패해도 로컬 세션은 이미 정리됨.
    if (id) disconnectCart(id).catch(() => {});
  }, []);

  // 캐스케이드: 회원이 로그아웃하면(복원이 끝난 뒤 비인증) 카트 세션도 종료한다.
  const wasAuthenticated = useRef(false);
  useEffect(() => {
    if (authRestoring) return;
    if (wasAuthenticated.current && !isAuthenticated) {
      endSession();
    }
    wasAuthenticated.current = isAuthenticated;
  }, [authRestoring, isAuthenticated, endSession]);

  const value = useMemo<CartSessionValue>(
    () => ({
      cartId,
      isConnected: cartId !== null,
      isRestoring,
      connect,
      endSession,
    }),
    [cartId, isRestoring, connect, endSession],
  );

  return <CartSessionContext.Provider value={value}>{children}</CartSessionContext.Provider>;
}

export function useCartSession(): CartSessionValue {
  const ctx = useContext(CartSessionContext);
  if (!ctx) {
    throw new Error('useCartSession은 CartSessionProvider 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}
