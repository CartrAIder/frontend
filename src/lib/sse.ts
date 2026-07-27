/**
 * SSE(Server-Sent Events) 연결 — Spring Boot → 앱 단방향 실시간 수신.
 * 장바구니 변경(상품 인식·수량 변경 등)을 실시간으로 받아 화면에 반영한다. WebSocket은 사용하지 않는다.
 *
 * 인증(티켓 방식): 액세스 토큰으로 `POST /api/carts/sse-ticket`을 호출해 1회용 티켓을 받고,
 * `GET /api/carts/subscribe?ticket=...`로 구독한다. (SSE는 헤더를 못 실으므로 티켓을 쿼리로 전달)
 * 서버는 매 변경마다 장바구니 "스냅샷 전체"(CartSnapshotResponse)를 내려주므로, 클라이언트는
 * 누적이 아니라 스냅샷으로 교체하고 version으로 순서 역전을 방어한다.
 *
 * RN에는 기본 EventSource가 없으므로 react-native-sse 폴리필을 사용한다.
 * EXPO_PUBLIC_USE_MOCK(기본 true)일 때는 실 연결 대신 mock 스냅샷 스트림을 재생한다.
 */
import EventSource from 'react-native-sse';

import { API_BASE_URL, apiFetch } from './api';
import { findProduct } from './mock/products';

const USE_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true') !== 'false';

/** 서버가 내려주는 장바구니 스냅샷 (백엔드 CartSnapshotResponse). */
export interface CartSnapshotItem {
  barcode: string;
  name: string;
  price: number;
  quantity: number;
}
export interface CartSnapshot {
  qrCode: string;
  version: number;
  items: CartSnapshotItem[];
  totalQuantity: number;
  totalPrice: number;
}

export interface CartStreamHandlers {
  onOpen?: () => void;
  /** cart-init / cart-updated 공통 — 장바구니 스냅샷 수신 */
  onSnapshot: (snapshot: CartSnapshot) => void;
  /** cart-closed — 카트 반납/결제완료로 세션 종료 */
  onClosed?: () => void;
  onError?: (error: unknown) => void;
}

export interface CartStream {
  close: () => void;
}

// ── 실서버 SSE ─────────────────────────────────────────────────────────

type CartEventName = 'connected' | 'cart-init' | 'cart-updated' | 'cart-closed';

async function connectRealCartStream(handlers: CartStreamHandlers): Promise<CartStream> {
  // 1) 티켓 발급 (액세스 토큰은 apiFetch가 자동 첨부)
  const { ticket } = await apiFetch<{ ticket: string; expiresInSeconds: number }>(
    '/api/carts/sse-ticket',
    { method: 'POST' },
  );

  // 2) 티켓으로 구독 (토큰은 URL에 싣지 않고 단명 티켓만 전달)
  const es = new EventSource<CartEventName>(
    `${API_BASE_URL}/api/carts/subscribe?ticket=${encodeURIComponent(ticket)}`,
  );

  const handleSnapshot = (event: { data?: string | null }) => {
    if (!event.data) return;
    try {
      handlers.onSnapshot(JSON.parse(event.data) as CartSnapshot);
    } catch (error) {
      handlers.onError?.(error);
    }
  };

  es.addEventListener('connected', () => handlers.onOpen?.());
  es.addEventListener('cart-init', handleSnapshot);
  es.addEventListener('cart-updated', handleSnapshot);
  es.addEventListener('cart-closed', () => handlers.onClosed?.());
  es.addEventListener('error', (error) => handlers.onError?.(error));

  return { close: () => es.close() };
}

// ── mock SSE (USE_MOCK) ────────────────────────────────────────────────

/** 상품이 하나씩 순차로 "인식"되는 것처럼 흉내내는 시연용 스캔 시나리오. */
const MOCK_SCAN_SCRIPT: { productId: string; qty: number }[] = [
  { productId: 'milk-seoul-1l', qty: 1 },
  { productId: 'milk-seoul-1l', qty: 1 },
  { productId: 'tuna-dongwon', qty: 1 },
  { productId: 'tuna-dongwon', qty: 1 },
  { productId: 'tuna-dongwon', qty: 1 },
  { productId: 'bread-samlip', qty: 1 },
  { productId: 'water-samdasu-2l', qty: 1 },
];

/** mock도 실서버처럼 "누적 스냅샷"을 순차로 내보낸다. */
function connectMockCartStream(handlers: CartStreamHandlers): CartStream {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;
  const items = new Map<string, CartSnapshotItem>();
  let version = 0;

  const emit = () => {
    const list = [...items.values()];
    handlers.onSnapshot({
      qrCode: 'mock',
      version: version++,
      items: list,
      totalQuantity: list.reduce((sum, it) => sum + it.quantity, 0),
      totalPrice: list.reduce((sum, it) => sum + it.price * it.quantity, 0),
    });
  };

  // 최초 연결 + 빈 스냅샷(cart-init 상당)
  timers.push(
    setTimeout(() => {
      if (cancelled) return;
      handlers.onOpen?.();
      emit();
    }, 300),
  );

  MOCK_SCAN_SCRIPT.forEach((scan, offset) => {
    const product = findProduct(scan.productId);
    if (!product) return;
    timers.push(
      setTimeout(
        () => {
          if (cancelled) return;
          const prev = items.get(product.id);
          items.set(product.id, {
            barcode: product.id,
            name: product.name,
            price: product.unitPrice,
            quantity: (prev?.quantity ?? 0) + scan.qty,
          });
          emit();
        },
        900 + offset * 900,
      ),
    );
  });

  return {
    close() {
      cancelled = true;
      timers.forEach(clearTimeout);
    },
  };
}

/** 장바구니 실시간 스트림 연결. 실서버는 티켓 발급이 필요해 Promise를 반환한다. */
export function connectCartStream(handlers: CartStreamHandlers): Promise<CartStream> {
  return USE_MOCK ? Promise.resolve(connectMockCartStream(handlers)) : connectRealCartStream(handlers);
}
