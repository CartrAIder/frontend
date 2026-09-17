/**
 * 장바구니 상태 — SSE로 들어오는 "장바구니 스냅샷"으로 목록을 교체하고,
 * 수량 조절·삭제는 낙관적으로 반영한 뒤 REST로 서버에 통보한다(서버가 다시 스냅샷을 밀어 최종 정정).
 *
 * 서버는 매 변경마다 전체 스냅샷(version 포함)을 내려주므로 누적이 아니라 "교체" 방식이며,
 * version이 이미 반영한 값보다 낮은(=오래된) 스냅샷은 무시해 순서 역전을 방어한다.
 * 상품 목록은 저장소에 영속화되어 앱을 나갔다 돌아와도 즉시 보여주고, 재연결 시 cart-init로 정정된다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { useCartSession } from '@/context/CartSessionContext';
import { ApiError, fetchCurrentCart, removeCartItem, setItemQty } from '@/lib/api';
import { loadCart, saveCart, type CartItem } from '@/lib/cartStorage';
import { connectCartStream, type CartSnapshot, type CartStream } from '@/lib/sse';

export type { CartItem } from '@/lib/cartStorage';

export interface LastScanned {
  id: string;
  name: string;
  qty: number;
  lineTotal: number;
  scannedAt: number;
}

type ConnectionStatus = 'idle' | 'connecting' | 'open';

interface CartState {
  items: CartItem[];
  connectionStatus: ConnectionStatus;
  lastScanned: LastScanned | null;
  lastVersion: number; // 마지막으로 반영한 스냅샷 version (-1 = 아직 없음)
  hydrated: boolean;
}

type CartAction =
  | { type: 'HYDRATE'; items: CartItem[] }
  | { type: 'HYDRATE_EMPTY' }
  | { type: 'STREAM_START' }
  | { type: 'CONNECTION_STATUS'; status: ConnectionStatus }
  | { type: 'SNAPSHOT'; snapshot: CartSnapshot }
  | { type: 'SET_QTY'; itemId: string; qty: number }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'RESET' };

const initialState: CartState = {
  items: [],
  connectionStatus: 'idle',
  lastScanned: null,
  lastVersion: -1,
  hydrated: false,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, items: action.items, hydrated: true };
    case 'HYDRATE_EMPTY':
      return { ...state, hydrated: true };
    case 'STREAM_START':
      // 새 구독 시작: 이후 오는 cart-init을 반드시 받도록 version 기준을 초기화한다.
      return { ...state, connectionStatus: 'connecting', lastVersion: -1 };
    case 'CONNECTION_STATUS':
      return { ...state, connectionStatus: action.status };
    case 'SNAPSHOT': {
      const snap = action.snapshot;
      if (snap.version <= state.lastVersion) return state; // 오래된 스냅샷 무시
      const items = snap.items.map((it) => ({
        id: it.barcode,
        name: it.name,
        unitPrice: it.price,
        qty: it.quantity,
      }));
      // 첫 스냅샷(cart-init)이 아닐 때만 "방금 담김" 하이라이트용 증가분을 계산한다.
      let lastScanned = state.lastScanned;
      if (state.lastVersion >= 0) {
        for (const it of items) {
          const prev = state.items.find((p) => p.id === it.id);
          const delta = it.qty - (prev?.qty ?? 0);
          if (delta > 0) {
            lastScanned = { id: it.id, name: it.name, qty: delta, lineTotal: it.unitPrice * delta, scannedAt: Date.now() };
            break;
          }
        }
      }
      return { ...state, items, lastVersion: snap.version, lastScanned };
    }
    case 'SET_QTY':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.itemId ? { ...item, qty: Math.max(1, action.qty) } : item,
        ),
      };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((item) => item.id !== action.itemId) };
    case 'RESET':
      return { ...initialState, hydrated: true };
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  connectionStatus: ConnectionStatus;
  lastScanned: LastScanned | null;
  itemCount: number;
  totalQty: number;
  total: number;
  increaseQty: (itemId: string) => void;
  decreaseQty: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  reset: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { cartId, isConnected, isRestoring: sessionRestoring, refreshSession } = useCartSession();
  const itemsRef = useRef(state.items);
  itemsRef.current = state.items;
  const cartIdRef = useRef(cartId);
  cartIdRef.current = cartId;

  // 마운트 시 저장된 장바구니 복원(즉시 표시용, 연결되면 cart-init로 정정됨).
  useEffect(() => {
    loadCart()
      .then((stored) => {
        if (stored) {
          dispatch({ type: 'HYDRATE', items: stored.items });
        } else {
          dispatch({ type: 'HYDRATE_EMPTY' });
        }
      })
      .catch(() => dispatch({ type: 'HYDRATE_EMPTY' }));
  }, []);

  // 변경 시 영속화(복원 완료 이후에만). scanIndex는 더 이상 쓰지 않아 0 고정.
  useEffect(() => {
    if (!state.hydrated) return;
    saveCart({ items: state.items, scanIndex: 0 });
  }, [state.hydrated, state.items]);

  // SSE 연결 — 복원이 끝나고 카트가 연결됐을 때만. 실서버는 티켓 발급이 필요해 Promise.
  useEffect(() => {
    if (!state.hydrated || !isConnected || !cartId) return undefined;

    dispatch({ type: 'STREAM_START' });
    let stream: CartStream | undefined;
    let active = true;

    connectCartStream({
      onOpen: () => {
        dispatch({ type: 'CONNECTION_STATUS', status: 'open' });
        // SSE는 구독 시점의 현재 장바구니를 내려주지 않으므로(cart-init은 구독 이전 발행),
        // (재)접속마다 현재 카트를 REST로 받아 반영한다. 오래된 version은 리듀서가 무시한다. (#14)
        fetchCurrentCart()
          .then((session) => {
            if (session?.snapshot) dispatch({ type: 'SNAPSHOT', snapshot: session.snapshot });
          })
          .catch(() => {
            // 조회 실패는 무시 — 이후 SSE 스냅샷으로 정정된다.
          });
      },
      onSnapshot: (snapshot) => dispatch({ type: 'SNAPSHOT', snapshot }),
      onClosed: () => dispatch({ type: 'RESET' }),
      onError: () => dispatch({ type: 'CONNECTION_STATUS', status: 'connecting' }), // 끊김 → 자동 재연결 중
    })
      .then((s) => {
        if (!active) {
          s.close();
          return;
        }
        stream = s;
      })
      .catch(() => dispatch({ type: 'CONNECTION_STATUS', status: 'idle' }));

    return () => {
      active = false;
      stream?.close();
    };
  }, [state.hydrated, isConnected, cartId]);

  // 캐스케이드: 카트 세션이 종료되면(복원 후 미연결) 장바구니를 비운다.
  const wasConnected = useRef(false);
  useEffect(() => {
    if (sessionRestoring) return;
    if (wasConnected.current && !isConnected) {
      dispatch({ type: 'RESET' });
    }
    wasConnected.current = isConnected;
  }, [sessionRestoring, isConnected]);

  /**
   * 수량 변경·삭제가 서버에서 거절됐을 때 되돌린다.
   * 낙관적 업데이트는 SSE 스냅샷이 정정해주지만, 서버가 거절한 요청은 아무 이벤트도
   * 발행하지 않아 화면만 틀어진다. 그래서 실패하면 현재 카트를 다시 받아 맞춘다.
   * 결제 대기로 잠긴 카트(409 CART_PAYMENT_PENDING)면 세션 상태도 갱신해 화면을 잠근다.
   */
  const revertOnFailure = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.code === 'CART_PAYMENT_PENDING') {
        refreshSession();
      }
      fetchCurrentCart()
        .then((session) => {
          if (session?.snapshot) dispatch({ type: 'SNAPSHOT', snapshot: session.snapshot });
        })
        .catch(() => {
          // 재조회까지 실패 — 다음 SSE 스냅샷을 기다린다.
        });
    },
    [refreshSession],
  );

  const increaseQty = useCallback((itemId: string) => {
    const item = itemsRef.current.find((i) => i.id === itemId);
    if (!item) return;
    const next = item.qty + 1;
    dispatch({ type: 'SET_QTY', itemId, qty: next }); // 낙관적, SSE 스냅샷이 최종 정정
    if (cartIdRef.current) setItemQty(cartIdRef.current, itemId, next).catch(revertOnFailure);
  }, [revertOnFailure]);

  const decreaseQty = useCallback((itemId: string) => {
    const item = itemsRef.current.find((i) => i.id === itemId);
    if (!item) return;
    if (item.qty <= 1) {
      dispatch({ type: 'REMOVE_ITEM', itemId });
      if (cartIdRef.current) removeCartItem(cartIdRef.current, itemId).catch(revertOnFailure);
      return;
    }
    const next = item.qty - 1;
    dispatch({ type: 'SET_QTY', itemId, qty: next });
    if (cartIdRef.current) setItemQty(cartIdRef.current, itemId, next).catch(revertOnFailure);
  }, [revertOnFailure]);

  const removeItem = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', itemId });
    if (cartIdRef.current) removeCartItem(cartIdRef.current, itemId).catch(revertOnFailure);
  }, [revertOnFailure]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const value = useMemo<CartContextValue>(() => {
    const totalQty = state.items.reduce((sum, item) => sum + item.qty, 0);
    const total = state.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    return {
      items: state.items,
      connectionStatus: state.connectionStatus,
      lastScanned: state.lastScanned,
      itemCount: state.items.length,
      totalQty,
      total,
      increaseQty,
      decreaseQty,
      removeItem,
      reset,
    };
  }, [state, increaseQty, decreaseQty, removeItem, reset]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart는 CartProvider 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}
