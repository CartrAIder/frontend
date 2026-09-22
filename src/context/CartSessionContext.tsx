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
import {
  connectCart,
  disconnectCart,
  fetchCurrentCart,
  type CheckoutStatus,
  type PendingOrder,
} from '@/lib/api';
import { clearCartId, loadCartId, saveCartId } from '@/lib/cartStorage';

interface CartSessionValue {
  cartId: string | null;
  isConnected: boolean;
  isRestoring: boolean;
  /** PAYMENT_PENDING이면 카트가 잠겨 있다(수량 변경·스캔·반납 불가). */
  checkoutStatus: CheckoutStatus;
  /** 결제가 끝나지 않은 주문. 앱을 껐다 켜도 서버에서 복구된다. */
  pendingOrder: PendingOrder | null;
  connect: (code: string) => Promise<void>;
  endSession: () => void;
  /** 결제 승인 후처럼 서버가 이미 카트를 정리한 경우 — 로컬 상태만 비운다. */
  endSessionLocally: () => void;
  /** 서버 기준으로 카트 세션·결제 대기 상태를 다시 맞춘다. */
  refreshSession: () => Promise<void>;
}

const CartSessionContext = createContext<CartSessionValue | undefined>(undefined);

export function CartSessionProvider({ children }: { children: ReactNode }) {
  const [cartId, setCartId] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>('SHOPPING');
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const { isRestoring: authRestoring, isAuthenticated } = useAuth();
  // endSession이 항상 최신 cartId를 참조하도록(콜백 identity는 안정 유지) ref 사용.
  // 렌더가 아니라 커밋 이후에 맞춘다 — 읽는 쪽은 전부 콜백이라 순서상 문제가 없다.
  const cartIdRef = useRef<string | null>(null);
  useEffect(() => {
    cartIdRef.current = cartId;
  }, [cartId]);

  useEffect(() => {
    loadCartId()
      .then(setCartId)
      .finally(() => setIsRestoring(false));
  }, []);

  const connect = useCallback(async (code: string) => {
    const result = await connectCart(code);
    setCartId(result.cartId);
    setCheckoutStatus(result.checkoutStatus);
    setPendingOrder(result.pendingOrder);
    await saveCartId(result.cartId);
  }, []);

  /** 로컬 상태만 초기화(서버 호출 없음). */
  const resetLocal = useCallback(() => {
    setCartId(null);
    setCheckoutStatus('SHOPPING');
    setPendingOrder(null);
    clearCartId().catch(() => {
      // 삭제 실패는 무시 — 메모리 상 상태는 이미 초기화됨.
    });
  }, []);

  const endSession = useCallback(() => {
    const id = cartIdRef.current;
    resetLocal();
    // 서버 점유 해제(best-effort) — 실패해도 로컬 세션은 이미 정리됨.
    if (id) disconnectCart(id).catch(() => {});
  }, [resetLocal]);

  // 결제가 승인되면 백엔드(PaymentService)가 카트 세션을 알아서 닫는다.
  // 여기서 DELETE를 또 부르면 이미 사라진 세션이라 404가 나므로 로컬만 정리한다.
  const endSessionLocally = useCallback(() => {
    resetLocal();
  }, [resetLocal]);

  /**
   * 서버의 현재 카트로 로컬 세션을 맞춘다.
   * - 서버에 세션이 없으면(카트 TTL 만료·다른 기기에서 반납) 로컬 cartId도 버린다.
   * - 결제 대기 주문이 남아 있으면 복구해 "이어서 결제"를 띄울 수 있게 한다.
   */
  const refreshSession = useCallback(async () => {
    try {
      const session = await fetchCurrentCart();
      if (!session) {
        if (cartIdRef.current) resetLocal();
        return;
      }
      setCartId(session.cartId);
      setCheckoutStatus(session.checkoutStatus);
      setPendingOrder(session.pendingOrder);
      await saveCartId(session.cartId);
    } catch {
      // 네트워크/인증 실패 — 로컬 상태를 그대로 두고 다음 기회에 다시 맞춘다.
    }
  }, [resetLocal]);

  // 로그인 상태가 되면 서버 카트와 한 번 맞춘다(결제 대기 복구 · 만료된 로컬 세션 정리).
  useEffect(() => {
    if (authRestoring || isRestoring || !isAuthenticated) return;
    refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authRestoring, isRestoring, isAuthenticated]);

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
      checkoutStatus,
      pendingOrder,
      connect,
      endSession,
      endSessionLocally,
      refreshSession,
    }),
    [
      cartId,
      isRestoring,
      checkoutStatus,
      pendingOrder,
      connect,
      endSession,
      endSessionLocally,
      refreshSession,
    ],
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
