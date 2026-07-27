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

const RECONNECT_MAX_DELAY = 10000; // 재연결 백오프 상한(ms)

/**
 * 실서버 SSE 연결 + 수동 재연결.
 * 구독은 1회용 티켓 기반이라 EventSource 내장 자동재연결(같은 URL 재시도)은 못 쓴다(pollingInterval: 0).
 * 대신 끊기면 우리가 새 티켓을 발급받아 다시 구독한다(지수 백오프).
 */
function connectRealCartStream(handlers: CartStreamHandlers): CartStream {
  let closed = false;
  let es: EventSource<CartEventName> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const handleSnapshot = (event: { data?: string | null }) => {
    if (!event.data) return;
    try {
      handlers.onSnapshot(JSON.parse(event.data) as CartSnapshot);
    } catch (error) {
      handlers.onError?.(error);
    }
  };

  const scheduleReconnect = () => {
    if (closed || reconnectTimer) return;
    attempt += 1;
    const delay = Math.min(1000 * 2 ** (attempt - 1), RECONNECT_MAX_DELAY); // 1s,2s,4s,…,10s
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void open();
    }, delay);
  };

  const open = async () => {
    if (closed) return;
    try {
      // 1) 매 연결마다 새 티켓 발급 (액세스 토큰은 apiFetch가 자동 첨부)
      const { ticket } = await apiFetch<{ ticket: string; expiresInSeconds: number }>(
        '/api/carts/sse-ticket',
        { method: 'POST' },
      );
      if (closed) return;

      // 2) 티켓으로 구독. pollingInterval: 0 → 내장 자동재연결 비활성(써버린 티켓 재시도 방지)
      const source = new EventSource<CartEventName>(
        `${API_BASE_URL}/api/carts/subscribe?ticket=${encodeURIComponent(ticket)}`,
        { pollingInterval: 0 },
      );
      es = source;

      source.addEventListener('connected', () => {
        attempt = 0; // 정상 연결되면 백오프 초기화
        handlers.onOpen?.();
      });
      source.addEventListener('cart-init', handleSnapshot);
      source.addEventListener('cart-updated', handleSnapshot);
      source.addEventListener('cart-closed', () => handlers.onClosed?.());
      source.addEventListener('error', (error) => {
        if (closed) return;
        handlers.onError?.(error); // 화면은 '재연결 중'으로
        source.close();
        if (es === source) es = null;
        scheduleReconnect();
      });
    } catch (error) {
      // 티켓 발급 실패 등 → 잠시 후 재시도
      if (closed) return;
      handlers.onError?.(error);
      scheduleReconnect();
    }
  };

  void open();

  return {
    close() {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      es?.close();
      es = null;
    },
  };
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

/** 장바구니 실시간 스트림 연결. 연결·재연결은 내부에서 비동기로 처리되고 스트림 핸들은 즉시 반환된다. */
export function connectCartStream(handlers: CartStreamHandlers): Promise<CartStream> {
  return Promise.resolve(USE_MOCK ? connectMockCartStream(handlers) : connectRealCartStream(handlers));
}
