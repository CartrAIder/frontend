/**
 * SSE(Server-Sent Events) 연결 — Spring Boot → 앱 단방향 실시간 수신.
 * 장바구니 변경(상품 인식)을 실시간으로 받아 화면에 반영한다. WebSocket은 사용하지 않는다.
 *
 * RN에는 기본 EventSource가 없으므로 react-native-sse 폴리필을 사용한다.
 * 백엔드 SSE 인증 방식이 미확정이므로 EXPO_PUBLIC_USE_MOCK(기본 true)일 때는
 * 실 연결 대신 상품이 하나씩 순차로 "스캔"되는 mock 스트림을 사용한다.
 */
import EventSource from 'react-native-sse';

import { findProduct } from './mock/products';

export const SSE_ENDPOINT = '/api/carts/stream';
const USE_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true') !== 'false';

export interface ScannedItemEvent {
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
}

export interface CartStreamHandlers {
  onOpen?: () => void;
  onItemScanned: (event: ScannedItemEvent) => void;
  onError?: (error: unknown) => void;
}

export interface CartStream {
  close: () => void;
}

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

function connectMockCartStream(handlers: CartStreamHandlers): CartStream {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;

  timers.push(
    setTimeout(() => {
      if (!cancelled) handlers.onOpen?.();
    }, 300),
  );

  MOCK_SCAN_SCRIPT.forEach((scan, index) => {
    const product = findProduct(scan.productId);
    if (!product) return;
    timers.push(
      setTimeout(
        () => {
          if (cancelled) return;
          handlers.onItemScanned({
            productId: product.id,
            name: product.name,
            unitPrice: product.unitPrice,
            qty: scan.qty,
          });
        },
        900 + index * 900,
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

/** TODO(api): 실 SSE 엔드포인트·인증 방식(쿼리 토큰 vs 헤더)·이벤트 스키마 확정 시 구현 (Sprint 6). */
function connectRealCartStream(cartId: string, handlers: CartStreamHandlers): CartStream {
  const es = new EventSource(`${SSE_ENDPOINT}?cartId=${cartId}`);

  es.addEventListener('open', () => handlers.onOpen?.());
  es.addEventListener('message', (event) => {
    if (!event.data) return;
    try {
      handlers.onItemScanned(JSON.parse(event.data) as ScannedItemEvent);
    } catch (error) {
      handlers.onError?.(error);
    }
  });
  es.addEventListener('error', (error) => handlers.onError?.(error));

  return {
    close: () => es.close(),
  };
}

export function connectCartStream(cartId: string, handlers: CartStreamHandlers): CartStream {
  return USE_MOCK ? connectMockCartStream(handlers) : connectRealCartStream(cartId, handlers);
}
