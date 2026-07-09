/**
 * Custom fetch wrapper — 모든 REST 요청에 회원 JWT를 자동 첨부하고 에러를 공통 처리한다.
 * Axios는 사용하지 않는다.
 *
 * 백엔드 API 명세가 미확정인 함수는 mock으로 동작한다 (EXPO_PUBLIC_USE_MOCK, 기본 true).
 * Sprint 6에서 실 엔드포인트가 확정되면 각 함수의 mock 분기만 교체하면 된다.
 */
import {
  loadAccount,
  loadMemberSession,
  saveAccount,
  type MemberSession,
} from './authStorage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
const USE_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true') !== 'false';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await loadMemberSession();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }
  return (await res.json()) as T;
}

// ── 회원 인증 ──────────────────────────────────────────────────────────

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface AuthResult {
  member: { id: string; name: string; email: string };
  token: string;
}

/** AuthResult(REST 응답)를 secure-store에 저장할 회원 세션 형태로 변환한다. */
export function toSession(result: AuthResult): MemberSession {
  return {
    id: result.member.id,
    name: result.member.name,
    email: result.member.email,
    token: result.token,
  };
}

/**
 * 회원가입. mock에서는 계정을 로컬(secure-store)에 저장하고 바로 로그인 세션을 발급한다.
 * TODO(api): 실제 Spring Boot 연동 시 mock 분기를 `POST /api/auth/signup`으로 교체.
 */
export async function signupMember(input: SignupInput): Promise<AuthResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!name || !email || !password) {
    throw new Error('이름·이메일·비밀번호를 모두 입력해주세요.');
  }

  if (USE_MOCK) {
    await delay(600);
    await saveAccount({ name, email, password });
    return { member: { id: email, name, email }, token: `mock-jwt-${email}` };
  }

  return apiFetch<AuthResult>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

/**
 * 로그인. mock에서는 회원가입 때 저장한 로컬 계정과 이메일·비밀번호를 대조한다.
 * TODO(api): 실제 Spring Boot 연동 시 mock 분기를 `POST /api/auth/login`으로 교체.
 */
export async function loginMember(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error('이메일과 비밀번호를 입력해주세요.');
  }

  if (USE_MOCK) {
    await delay(600);
    const account = await loadAccount();
    if (!account) {
      throw new Error('가입된 계정이 없어요. 먼저 회원가입을 해주세요.');
    }
    if (account.email !== normalizedEmail || account.password !== password) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않아요.');
    }
    return {
      member: { id: account.email, name: account.name, email: account.email },
      token: `mock-jwt-${account.email}`,
    };
  }

  return apiFetch<AuthResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: normalizedEmail, password }),
  });
}

// ── 카트 세션 ──────────────────────────────────────────────────────────

export interface ConnectCartResult {
  cartId: string;
}

/**
 * 카트 QR/코드로 세션을 연결한다. 회원 토큰으로 이미 인증된 상태이므로 cartId만 받는다.
 * TODO(api): 실제 Spring Boot 연동 엔드포인트·응답 스키마 확정 시 mock 분기 교체.
 */
export async function connectCart(code: string): Promise<ConnectCartResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error('카트 코드를 입력해주세요.');
  }

  if (USE_MOCK) {
    await delay(500);
    return { cartId: trimmed.toUpperCase() };
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
