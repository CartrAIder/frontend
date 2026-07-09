/**
 * 장바구니 상태 — SSE로 들어오는 "상품 인식" 이벤트를 누적하고,
 * 수량 조절·삭제는 낙관적으로 반영한 뒤 REST(mock)로 서버에 통보한다.
 *
 * 상품 목록은 secure-store에 영속화되어 앱을 나갔다 돌아와도 복원된다.
 * scanIndex는 mock 스캔 스크립트의 진행 위치로, 복원 후 이미 담긴 상품을
 * 다시 스캔하지 않도록(중복 방지) SSE 재생 시작점으로 넘긴다.
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
import { removeCartItem, updateItemQty } from '@/lib/api';
import { loadCart, saveCart, type CartItem } from '@/lib/cartStorage';
import { connectCartStream, type ScannedItemEvent } from '@/lib/sse';

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
  scanIndex: number;
  hydrated: boolean;
}

type CartAction =
  | { type: 'HYDRATE'; items: CartItem[]; scanIndex: number }
  | { type: 'HYDRATE_EMPTY' }
  | { type: 'CONNECTION_STATUS'; status: ConnectionStatus }
  | { type: 'ITEM_SCANNED'; event: ScannedItemEvent }
  | { type: 'SET_QTY'; itemId: string; qty: number }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'RESET' };

const initialState: CartState = {
  items: [],
  connectionStatus: 'idle',
  lastScanned: null,
  scanIndex: 0,
  hydrated: false,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, items: action.items, scanIndex: action.scanIndex, hydrated: true };
    case 'HYDRATE_EMPTY':
      return { ...state, hydrated: true };
    case 'CONNECTION_STATUS':
      return { ...state, connectionStatus: action.status };
    case 'ITEM_SCANNED': {
      const { productId, name, unitPrice, qty } = action.event;
      const existing = state.items.find((item) => item.id === productId);
      const items = existing
        ? state.items.map((item) =>
            item.id === productId ? { ...item, qty: item.qty + qty } : item,
          )
        : [...state.items, { id: productId, name, unitPrice, qty }];
      return {
        ...state,
        items,
        scanIndex: state.scanIndex + 1,
        lastScanned: { id: productId, name, qty, lineTotal: unitPrice * qty, scannedAt: Date.now() },
      };
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
  const { cartId, isConnected, isRestoring: sessionRestoring } = useCartSession();
  const itemsRef = useRef(state.items);
  itemsRef.current = state.items;
  const scanIndexRef = useRef(state.scanIndex);
  scanIndexRef.current = state.scanIndex;

  // 마운트 시 저장된 장바구니 복원.
  useEffect(() => {
    loadCart()
      .then((stored) => {
        if (stored) {
          dispatch({ type: 'HYDRATE', items: stored.items, scanIndex: stored.scanIndex });
        } else {
          dispatch({ type: 'HYDRATE_EMPTY' });
        }
      })
      .catch(() => dispatch({ type: 'HYDRATE_EMPTY' }));
  }, []);

  // 변경 시 영속화(복원 완료 이후에만).
  useEffect(() => {
    if (!state.hydrated) return;
    saveCart({ items: state.items, scanIndex: state.scanIndex });
  }, [state.hydrated, state.items, state.scanIndex]);

  // SSE 연결 — 복원이 끝나고 카트가 연결됐을 때만. 재생 시작점은 복원된 scanIndex.
  useEffect(() => {
    if (!state.hydrated || !isConnected || !cartId) return undefined;

    dispatch({ type: 'CONNECTION_STATUS', status: 'connecting' });
    const stream = connectCartStream(
      cartId,
      {
        onOpen: () => dispatch({ type: 'CONNECTION_STATUS', status: 'open' }),
        onItemScanned: (event) => dispatch({ type: 'ITEM_SCANNED', event }),
      },
      { fromIndex: scanIndexRef.current },
    );

    return () => stream.close();
    // scanIndex는 연결 시점에 ref로 읽으므로 deps에서 제외(매 스캔마다 재연결 방지).
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

  const increaseQty = useCallback((itemId: string) => {
    const item = itemsRef.current.find((i) => i.id === itemId);
    if (!item) return;
    const nextQty = item.qty + 1;
    dispatch({ type: 'SET_QTY', itemId, qty: nextQty });
    updateItemQty(itemId, nextQty).catch(() => {});
  }, []);

  const decreaseQty = useCallback((itemId: string) => {
    const item = itemsRef.current.find((i) => i.id === itemId);
    if (!item) return;
    if (item.qty <= 1) {
      dispatch({ type: 'REMOVE_ITEM', itemId });
      removeCartItem(itemId).catch(() => {});
      return;
    }
    const nextQty = item.qty - 1;
    dispatch({ type: 'SET_QTY', itemId, qty: nextQty });
    updateItemQty(itemId, nextQty).catch(() => {});
  }, []);

  const removeItem = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', itemId });
    removeCartItem(itemId).catch(() => {});
  }, []);

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
