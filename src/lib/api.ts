/**
 * Custom fetch wrapper — 모든 REST 요청에 JWT를 자동 첨부하고 에러를 공통 처리한다.
 * Axios는 사용하지 않는다.
 *
 * 백엔드 API 명세가 미확정인 함수는 mock으로 동작한다 (EXPO_PUBLIC_USE_MOCK, 기본 true).
 * Sprint 6에서 실 엔드포인트가 확정되면 각 함수의 mock 분기만 교체하면 된다.
 */
import { loadAuth } from './authStorage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
const USE_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true') !== 'false';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = await loadAuth();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (auth?.token) {
    headers.set('Authorization', `Bearer ${auth.token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }
  return (await res.json()) as T;
}

export interface ConnectCartResult {
  cartId: string;
  token: string;
}

/**
 * 카트 QR/코드로 세션을 연결한다.
 * TODO(api): 실제 Spring Boot 연동 엔드포인트·응답 스키마 확정 시 mock 분기 교체.
 */
export async function connectCart(code: string): Promise<ConnectCartResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error('카트 코드를 입력해주세요.');
  }

  if (USE_MOCK) {
    await delay(500);
    return { cartId: trimmed.toUpperCase(), token: `mock-jwt-${trimmed.toUpperCase()}` };
  }

  return apiFetch<ConnectCartResult>('/api/carts/connect', {
    method: 'POST',
    body: JSON.stringify({ code: trimmed }),
  });
}

/**
 * 장바구니 상품 수량을 변경한다.
 * TODO(api): 실제 엔드포인트 확정 시 mock 분기 교체.
 */
export async function updateItemQty(itemId: string, qty: number): Promise<void> {
  if (USE_MOCK) {
    await delay(300);
    return;
  }
  await apiFetch<void>(`/api/carts/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ qty }),
  });
}

/**
 * 장바구니 상품을 삭제한다.
 * TODO(api): 실제 엔드포인트 확정 시 mock 분기 교체.
 */
export async function removeCartItem(itemId: string): Promise<void> {
  if (USE_MOCK) {
    await delay(300);
    return;
  }
  await apiFetch<void>(`/api/carts/items/${itemId}`, { method: 'DELETE' });
}

export interface PaymentResult {
  receiptId: string;
}

/**
 * 결제를 요청한다. 실제 PG 연동은 범위 밖 — "결제 성공"을 가정하고 영수증만 발급한다.
 * TODO(api): 실제 엔드포인트 확정 시 mock 분기 교체.
 */
export async function requestPayment(cartId: string, amount: number): Promise<PaymentResult> {
  if (USE_MOCK) {
    await delay(700);
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return { receiptId: `${year}-${cartId}-${seq}` };
  }
  return apiFetch<PaymentResult>('/api/carts/payment', {
    method: 'POST',
    body: JSON.stringify({ cartId, amount }),
  });
}
