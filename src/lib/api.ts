/**
 * Custom fetch wrapper — 모든 REST 요청에 회원 JWT를 자동 첨부하고 에러를 공통 처리한다.
 * Axios는 사용하지 않는다.
 *
 * 회원 인증(회원가입·이메일 인증·로그인/로그아웃·토큰 재발급)은 실서버(`/api/mobile/auth`,
 * `/api/users`, `/api/email-verifications`)에 직접 연동돼 있다.
 * 카트/결제 등 아직 명세 미확정인 함수만 mock으로 동작한다 (EXPO_PUBLIC_USE_MOCK, 기본 true).
 */
import {
  loadMemberSession,
  saveMemberSession,
  type MemberRole,
  type MemberSession,
} from './authStorage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
const USE_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true') !== 'false';
/** mock 모드 여부 — 화면에서 시연용 UI(데모 관리자 버튼 등) 노출 조건으로 사용. */
export const IS_MOCK = USE_MOCK;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 백엔드 에러 응답({ message, details })에서 사용자에게 보여줄 문구를 뽑아낸다.
 * - 형식 오류(400): details 배열에 필드별 메시지가 오므로 이를 우선 노출한다.
 * - 그 외(409 중복, 401 등): message를 그대로 쓴다.
 */
/**
 * fetch + 타임아웃 + 네트워크 오류를 사용자 친화 메시지로 변환.
 * (서버가 꺼져있거나 와이파이가 끊기면 기본 fetch는 "Network request failed"를 던진다)
 */
async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') {
      throw new Error('서버 응답이 없어요. 잠시 후 다시 시도해주세요.');
    }
    throw new Error('서버에 연결할 수 없어요. 네트워크 연결을 확인해주세요.');
  } finally {
    clearTimeout(timer);
  }
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (Array.isArray(body?.details) && body.details.length > 0) {
      return body.details.join('\n');
    }
    if (typeof body?.message === 'string' && body.message) {
      return body.message;
    }
  } catch {
    // JSON 파싱 실패 시 아래 기본 문구로 폴백
  }
  return `요청에 실패했어요. (${res.status})`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retrying = false): Promise<T> {
  const session = await loadMemberSession();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const res = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...init, headers });

  // 액세스 토큰 만료(401) → 저장된 refresh 토큰으로 1회 재발급 후 원 요청을 그대로 재시도한다.
  // (동시 다발 401은 reissueOnce가 하나의 재발급으로 합친다. 재시도 요청엔 retrying=true를 줘 무한루프 방지)
  if (res.status === 401 && !retrying && session?.refreshToken) {
    const refreshed = await reissueOnce();
    if (refreshed) {
      return apiFetch<T>(path, init, true);
    }
  }

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }
  // 204 or empty body 대응 (삭제, 수량이 0일때, 로그아웃...등)
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── 회원 인증 ──────────────────────────────────────────────────────────

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

// ── 입력값 검증 (백엔드 규칙과 동일하게 클라이언트에서 선검증) ──────────────

/** 비밀번호 규칙 안내 문구 — 회원가입 폼에 그대로 표시한다. */
export const PASSWORD_RULE_TEXT = '영문·숫자·특수문자를 포함해 8~20자';

export interface PasswordChecks {
  length: boolean; // 8~20자
  letter: boolean; // 영문 포함
  digit: boolean; // 숫자 포함
  special: boolean; // 특수문자 포함
}

/** 비밀번호 각 조건 충족 여부. 실시간 체크리스트 표시에 사용한다. */
export function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= 8 && password.length <= 20,
    letter: /[A-Za-z]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=]/.test(password),
  };
}

/** 백엔드 정규식 ^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=]).{8,20}$ 와 동일 판정. */
export function isPasswordValid(password: string): boolean {
  return Object.values(checkPassword(password)).every(Boolean);
}

/** 이메일 형식 검증(간단). 백엔드 @Email 과 대략 일치. */
export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export interface AuthResult {
  member: { id: string; name: string; email: string; role: MemberRole };
  /** 액세스 토큰(요청 헤더에 첨부). */
  token: string;
  /** 리프레시 토큰(secure-store 보관, 재발급용). */
  refreshToken: string;
}

/** AuthResult(REST 응답)를 secure-store에 저장할 회원 세션 형태로 변환한다. */
export function toSession(result: AuthResult): MemberSession {
  return {
    id: result.member.id,
    name: result.member.name,
    email: result.member.email,
    token: result.token,
    refreshToken: result.refreshToken,
    role: result.member.role,
  };
}

// ── 이메일 인증 (회원가입 전 단계) ──────────────────────────────────────
// 서버는 회원가입 시 이메일 인증을 요구한다: 발송(6자리 코드) → 확인 → 가입.

/**
 * 인증번호 발송. 성공하면 서버가 6자리 코드를 이메일로 보낸다(코드 10분·재발송 1분 제한).
 * 실패 예: 이미 가입된 이메일(409), 재발송 쿨다운(429), 메일 발송 실패(502).
 * POST /api/email-verifications { email }
 */
export async function sendEmailVerification(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!isEmailValid(normalized)) {
    throw new Error('이메일 형식을 확인해주세요 (예: you@example.com)');
  }
  await apiFetch<{ message: string }>('/api/email-verifications', {
    method: 'POST',
    body: JSON.stringify({ email: normalized }),
  });
}

/**
 * 인증번호 확인. 6자리 코드가 맞으면 서버가 해당 이메일을 "인증됨"으로 표시한다(30분 유효).
 * 실패 예: 코드 불일치(400), 만료/미존재(400).
 * POST /api/email-verifications/confirm { email, code }
 */
export async function confirmEmailVerification(email: string, code: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const trimmedCode = code.trim();
  if (!/^\d{6}$/.test(trimmedCode)) {
    throw new Error('인증번호 6자리를 입력해주세요.');
  }
  await apiFetch<{ message: string }>('/api/email-verifications/confirm', {
    method: 'POST',
    body: JSON.stringify({ email: normalized, code: trimmedCode }),
  });
}

/**
 * 회원가입. 이메일 인증(sendEmailVerification→confirmEmailVerification)을 먼저 마쳐야 한다.
 * 서버는 회원 생성만 하고 토큰은 주지 않으므로, 가입 직후 곧바로 로그인해 세션을 발급받는다.
 * POST /api/users/signup { email, password, name } → { id, email, name, role }
 */
export async function signupMember(input: SignupInput): Promise<AuthResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!name || !email || !password) {
    throw new Error('이름·이메일·비밀번호를 모두 입력해주세요.');
  }

  await apiFetch<{ id: number; email: string; name: string; role: string }>('/api/users/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  return loginMember(email, password);
}

/**
 * 모바일 인증 응답 — 쿠키를 못 쓰는 네이티브 클라이언트용. 토큰을 body로 받아 secure-store에 보관한다.
 * (POST /api/mobile/auth/login · /reissue 공통)
 */
interface MobileAuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number; // 초
  refreshTokenExpiresIn: number; // 초
  tokenType: string; // "Bearer"
  name: string;
}

/**
 * 로그인. RN은 httpOnly 쿠키가 불안정하므로 모바일 전용 엔드포인트를 쓴다.
 * POST /api/mobile/auth/login { email, password }
 *   → { accessToken, refreshToken, accessTokenExpiresIn, refreshTokenExpiresIn, tokenType, name }
 * 응답 body엔 id/email/role이 없어 id·role은 액세스 토큰(JWT)에서, email은 입력값을 그대로 쓴다.
 */
export async function loginMember(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error('이메일과 비밀번호를 입력해주세요.');
  }

  const res = await fetchWithTimeout(`${API_BASE_URL}/api/mobile/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalizedEmail, password }),
  });
  if (!res.ok) {
    // 401이면 백엔드 메시지, 그 외엔 일반 문구
    const message = res.status === 401 ? await extractErrorMessage(res) : '로그인에 실패했어요. 잠시 후 다시 시도해주세요.';
    throw new Error(message);
  }

  const data = (await res.json()) as MobileAuthResponse;
  if (!data.accessToken) {
    throw new Error('로그인 토큰을 받지 못했습니다.');
  }
  const claims = decodeJWT(data.accessToken);
  return {
    member: {
      id: claims.sub,
      name: data.name,
      email: normalizedEmail,
      role: claims.role === 'ADMIN' ? 'admin' : 'user',
    },
    token: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

/**
 * 저장된 refresh 토큰으로 액세스/refresh 토큰을 재발급받아 세션을 갱신한다.
 * POST /api/mobile/auth/reissue { refreshToken } → MobileAuthResponse (refresh 토큰도 회전됨)
 * 성공 시 새 세션을 secure-store에 저장하고 반환한다. refresh 토큰이 없거나 만료(재발급 실패)면 null.
 * 응답엔 email이 없으므로 기존 세션의 email을 유지한다.
 */
export async function reissueSession(): Promise<MemberSession | null> {
  const session = await loadMemberSession();
  if (!session?.refreshToken) return null;
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/mobile/auth/reissue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as MobileAuthResponse;
    if (!data.accessToken) return null;
    const claims = decodeJWT(data.accessToken);
    const next: MemberSession = {
      id: claims.sub,
      name: data.name,
      email: session.email,
      token: data.accessToken,
      refreshToken: data.refreshToken,
      role: claims.role === 'ADMIN' ? 'admin' : 'user',
    };
    await saveMemberSession(next);
    return next;
  } catch {
    // 네트워크 오류 등은 재발급 실패로 간주(호출부가 로그아웃 처리)
    return null;
  }
}

/**
 * 동시에 여러 요청이 401을 만나도 재발급은 한 번만 수행하도록 합친다(중복 재발급·토큰 회전 경쟁 방지).
 */
let reissueInFlight: Promise<MemberSession | null> | null = null;
function reissueOnce(): Promise<MemberSession | null> {
  if (!reissueInFlight) {
    reissueInFlight = reissueSession().finally(() => {
      reissueInFlight = null;
    });
  }
  return reissueInFlight;
}

/**
 * 로그아웃 — 서버의 refresh 토큰을 무효화한다. (best-effort: 실패해도 로컬 세션은 정리한다)
 * POST /api/mobile/auth/logout { refreshToken }
 */
export async function logoutMember(): Promise<void> {
  const session = await loadMemberSession();
  if (!session?.refreshToken) return;
  try {
    await fetchWithTimeout(`${API_BASE_URL}/api/mobile/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
  } catch {
    // 네트워크 실패 등은 무시 — 로컬 로그아웃은 그대로 진행한다.
  }
}

/**
 * 저장된 액세스 토큰이 만료됐는지 검사. (앱 시작 시 세션 복원 후 만료 세션 자동 로그아웃용)
 * 디코드 불가(mock 토큰 등)거나 exp가 없으면 false(만료로 취급하지 않음).
 */
export function isTokenExpired(token: string): boolean {
  try {
    const exp = decodeJWT(token).exp;
    if (!exp) return false;
    return exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

/** JWT payload 디코드 (검증X, 표시용 정보 추출). RN/웹 공통(atob 없으면 Buffer). */
function decodeJWT(token: string): { sub: string; email?: string; role?: string; exp?: number } {
  const payload = token.split('.')[1];
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const json =
    typeof atob === 'function'
      ? decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join(''),
        )
      : Buffer.from(base64, 'base64').toString('utf-8');
  return JSON.parse(json);
}

// ── 카트 세션 ──────────────────────────────────────────────────────────

export interface ConnectCartResult {
  cartId: string; // 프론트 세션 식별자 = qrCode
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

  // 백엔드: { cartId(number), qrCode, status, connectionType, snapshot } 반환
  // 이후 SSE/수량/삭제 전부 qrCode 기준이므로 세션 식별자 qrCode로 사용.
  const res = await apiFetch<{ cartId: number; qrCode: string; status: string }>('/api/carts/connect', {
    method: 'POST',
    body: JSON.stringify({ qrCode: trimmed }),
  });
  return { cartId: res.qrCode };
}

/** 서버 장바구니 스냅샷 (백엔드 CartSnapshotResponse). SSE 스냅샷과 동일 형태. */
export interface CartSnapshotData {
  qrCode: string;
  version: number;
  items: { barcode: string; name: string; price: number; quantity: number }[];
  totalQuantity: number;
  totalPrice: number;
}

/**
 * 현재 연결된 카트의 스냅샷을 조회한다. GET /api/carts/current → { …, snapshot } (미연결이면 204→null).
 * SSE는 구독 시점의 현재 장바구니를 자동으로 내려주지 않으므로(연결 시 발행되는 cart-init은
 * 구독 이전이라 놓친다), (재)접속 때 이걸로 현재 장바구니를 동기화한다. (이슈 #14)
 */
export async function fetchCurrentCart(): Promise<CartSnapshotData | null> {
  const res = await apiFetch<{ snapshot: CartSnapshotData | null } | undefined>('/api/carts/current');
  return res?.snapshot ?? null;
}

/**
 * 카트 반납 — 담긴 상품 전체 비우기 + 점유(세션) 해제. 서버가 카트를 WAITING으로 되돌린다.
 * DELETE /api/carts/{qrCode} (소유자만). best-effort: 실패해도 로컬 세션은 정리한다.
 */
export async function disconnectCart(qrCode: string): Promise<void> {
  if (USE_MOCK) {
    await delay(200);
    return;
  }
  await apiFetch<void>(`/api/carts/${encodeURIComponent(qrCode)}`, { method: 'DELETE' });
}

/**
 * 장바구니 상품 수량을 지정 수량으로 설정한다.
 * PATCH /api/carts/{qrCode}/items/{barcode} — body의 `delta`는 (이름과 달리) "설정할 절대 수량"이다.
 * 0 이하를 보내면 서버가 아이템을 삭제하고 204. 결과는 SSE cart-updated 스냅샷으로도 반영된다.
 */
export async function setItemQty(qrCode: string, barcode: string, quantity: number): Promise<void> {
  if (USE_MOCK) {
    await delay(300);
    return;
  }
  await apiFetch<void>(`/api/carts/${encodeURIComponent(qrCode)}/items/${encodeURIComponent(barcode)}`, {
    method: 'PATCH',
    body: JSON.stringify({ delta: quantity }),
  });
}

/**
 * 장바구니 상품을 삭제한다.
 * DELETE /api/carts/{qrCode}/items/{barcode} → 204.
 */
export async function removeCartItem(qrCode: string, barcode: string): Promise<void> {
  if (USE_MOCK) {
    await delay(300);
    return;
  }
  await apiFetch<void>(`/api/carts/${encodeURIComponent(qrCode)}/items/${encodeURIComponent(barcode)}`, {
    method: 'DELETE',
  });
}

// ── 상품 카탈로그(백엔드) ────────────────────────────────────────────────
// 주문 생성은 상품 바코드가 아니라 백엔드 상품 id(Long)를 요구하므로, 결제 시
// 장바구니 아이템(바코드)을 상품 id로 변환하기 위해 이 목록을 사용한다.

export interface ApiProduct {
  id: number;
  barcode: string;
  name: string;
  price: number;
  category: string;
  status: string; // ON_SALE 등
}

/** 상품 목록 조회. GET /api/products → [{ id, barcode, name, price, category, status }] */
export async function fetchProducts(): Promise<ApiProduct[]> {
  return apiFetch<ApiProduct[]>('/api/products');
}

// ── 결제 (토스페이먼츠) ──────────────────────────────────────────────────
// 흐름: 주문 생성 → 결제 시도 생성 → (클라이언트에서 토스 결제창) → 승인.
// 토스 결제창은 클라이언트키로 초기화하고, 사용자가 결제를 마치면 paymentKey를 받아 승인한다.

export interface OrderDraft {
  orderId: string; // 외부 노출용 주문 식별자(토스 orderId로도 사용)
  orderName: string;
  totalAmount: number; // 서버가 상품가 기준으로 계산한 최종 금액(결제 금액의 기준)
}

/** 주문 생성. POST /api/orders { items:[{ productId, quantity }] } */
export async function createOrder(items: { productId: number; quantity: number }[]): Promise<OrderDraft> {
  const res = await apiFetch<{ id: number; orderId: string; orderName: string; totalAmount: number; status: string }>(
    '/api/orders',
    { method: 'POST', body: JSON.stringify({ items }) },
  );
  return { orderId: res.orderId, orderName: res.orderName, totalAmount: res.totalAmount };
}

export interface PaymentAttempt {
  paymentAttemptId: string;
  orderId: string;
  orderName: string;
  amount: number;
}

/** 결제 시도 생성. POST /api/orders/{orderId}/payment-attempts */
export async function createPaymentAttempt(orderId: string): Promise<PaymentAttempt> {
  const r = await apiFetch<{ paymentAttemptId: string; orderId: string; orderName: string; amount: number }>(
    `/api/orders/${encodeURIComponent(orderId)}/payment-attempts`,
    { method: 'POST' },
  );
  return { paymentAttemptId: r.paymentAttemptId, orderId: r.orderId, orderName: r.orderName, amount: r.amount };
}

/** 토스 클라이언트키(공개키) 조회 — 결제창 초기화용. GET /api/payments/client-key */
export async function getTossClientKey(): Promise<string> {
  const r = await apiFetch<{ clientKey: string }>('/api/payments/client-key');
  return r.clientKey;
}

export interface PaymentConfirmResult {
  paymentAttemptId: string;
  paymentKey: string | null;
  approvedAmount: number | null;
  status: string; // APPROVED / FAILED 등
  code?: string | null;
  message?: string | null;
}

/**
 * 결제 승인. POST /api/payments/confirm { paymentKey, orderId, amount, paymentAttemptId }
 * 승인 성공 시 status=APPROVED(200). 승인 실패는 502로 오며 apiFetch가 서버 메시지로 throw 한다.
 */
export async function confirmPayment(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
  paymentAttemptId: string;
}): Promise<PaymentConfirmResult> {
  return apiFetch<PaymentConfirmResult>('/api/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
