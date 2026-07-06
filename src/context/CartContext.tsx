/**
 * 장바구니 상태 — SSE로 들어오는 "상품 인식" 이벤트를 누적하고,
 * 수량 조절·삭제는 낙관적으로 반영한 뒤 REST(mock)로 서버에 통보한다.
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

import { useAuth } from '@/context/AuthContext';
import { removeCartItem, updateItemQty } from '@/lib/api';
import { connectCartStream, type ScannedItemEvent } from '@/lib/sse';

export interface CartItem {
  id: string;
  name: string;
  unitPrice: number;
  qty: number;
}

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
}

type CartAction =
  | { type: 'CONNECTION_STATUS'; status: ConnectionStatus }
  | { type: 'ITEM_SCANNED'; event: ScannedItemEvent }
  | { type: 'SET_QTY'; itemId: string; qty: number }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'RESET' };

const initialState: CartState = {
  items: [],
  connectionStatus: 'idle',
  lastScanned: null,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
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
      return initialState;
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
  const { isAuthenticated, cartId } = useAuth();
  const itemsRef = useRef(state.items);
  itemsRef.current = state.items;

  useEffect(() => {
    if (!isAuthenticated || !cartId) return undefined;

    dispatch({ type: 'CONNECTION_STATUS', status: 'connecting' });
    const stream = connectCartStream(cartId, {
      onOpen: () => dispatch({ type: 'CONNECTION_STATUS', status: 'open' }),
      onItemScanned: (event) => dispatch({ type: 'ITEM_SCANNED', event }),
    });

    return () => stream.close();
  }, [isAuthenticated, cartId]);

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
