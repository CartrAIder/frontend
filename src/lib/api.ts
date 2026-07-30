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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await loadMemberSession();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const res = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...init, headers });
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
  token: string;
}

/**
 * 시연용 관리자 계정 (mock 전용).
 * 회원가입으로는 만들 수 없고, 이 자격 증명으로 로그인해야만 role: 'admin'이 발급된다.
 * TODO(api): 실서버 연동 시 역할은 백엔드가 내려주므로 이 상수는 삭제한다.
 */
export const DEMO_ADMIN = {
  email: 'admin@cartraider.com',
  password: 'admin1234',
  name: '매장 관리자',
} as const;

/** AuthResult(REST 응답)를 secure-store에 저장할 회원 세션 형태로 변환한다. */
export function toSession(result: AuthResult): MemberSession {
  return {
    id: result.member.id,
    name: result.member.name,
    email: result.member.email,
    token: result.token,
    role: result.member.role,
  };
}

// ── 이메일 인증 (회원가입 전 단계) ──────────────────────────────────────
// 서버는 회원가입 시 이메일 인증을 요구한다: 발송(6자리 코드) → 확인 → 가입.
// mock 모드에서는 네트워크 없이 흐름만 시연한다(테스트 코드 000000).

/** mock 인증에서 통과 처리하는 고정 코드. 실서버에서는 사용되지 않는다. */
export const MOCK_VERIFICATION_CODE = '000000';

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
  if (USE_MOCK) {
    await delay(600);
    return; // 실제 발송 없음 — 확인 단계에서 000000 입력
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
  if (USE_MOCK) {
    await delay(400);
    if (trimmedCode !== MOCK_VERIFICATION_CODE) {
      throw new Error('인증번호가 일치하지 않습니다.');
    }
    return;
  }
  await apiFetch<{ message: string }>('/api/email-verifications/confirm', {
    method: 'POST',
    body: JSON.stringify({ email: normalized, code: trimmedCode }),
  });
}

/**
 * 회원가입. mock에서는 계정을 로컬(secure-store)에 저장하고 바로 로그인 세션을 발급한다.
 * 실서버에서는 이메일 인증(sendEmailVerification→confirmEmailVerification)을 먼저 마쳐야 한다.
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
    if (email === DEMO_ADMIN.email) {
      throw new Error('이미 사용 중인 이메일이에요.');
    }
    await saveAccount({ name, email, password });
    return { member: { id: email, name, email, role: 'user' }, token: `mock-jwt-${email}` };
  }

  // 실서버: 회원 생성만 하고 토큰은 주지 않으므로, 가입 직후 곧바로 로그인해 세션을 발급받는다.
  await apiFetch<{ id: number; email: string; name: string; role: string }>('/api/users/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  return loginMember(email, password);
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

    // 관리자 계정은 로컬 가입 계정과 별개로 먼저 대조한다.
    if (normalizedEmail === DEMO_ADMIN.email) {
      if (password !== DEMO_ADMIN.password) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않아요.');
      }
      return {
        member: { id: DEMO_ADMIN.email, name: DEMO_ADMIN.name, email: DEMO_ADMIN.email, role: 'admin' },
        token: `mock-jwt-admin-${DEMO_ADMIN.email}`,
      };
    }

    const account = await loadAccount();
    if (!account) {
      throw new Error('가입된 계정이 없어요. 먼저 회원가입을 해주세요.');
    }
    if (account.email !== normalizedEmail || account.password !== password) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않아요.');
    }
    return {
      member: { id: account.email, name: account.name, email: account.email, role: 'user' },
      token: `mock-jwt-${account.email}`,
    };
  }

  // 실서버: 응답 body는 비어있고 액세스 토큰은 Authorization 응답 헤더로 온다.
  // (리프레시 토큰은 refreshToken 쿠키. 웹에서는 credentials: 'include'로 저장한다.)
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email: normalizedEmail, password }),
  });
  if (!res.ok) {
    // 401이면 백엔드 메시지, 그 외엔 일반 문구
    const message = res.status === 401 ? await extractErrorMessage(res) : '로그인에 실패했어요. 잠시 후 다시 시도해주세요.';
    throw new Error(message);
  }

  const authHeader = res.headers.get('authorization') ?? res.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') ?? '';
  if (!token) {
    throw new Error('로그인 토큰을 받지 못했습니다.');
  }

  // 로그인 응답에 회원정보가 없어 JWT에서 추출한다. (name은 토큰에 없어 이메일 앞부분으로 임시 표시)
  // TODO(api): 백엔드가 name을 내려주면(로그인 응답 body 또는 /api/users/me) 교체한다.
  const claims = decodeJWT(token);
  const role: MemberRole = claims.role === 'ADMIN' ? 'admin' : 'user';
  const memberEmail = claims.email ?? normalizedEmail;
  return {
    member: {
      id: claims.sub,
      name: memberEmail.split('@')[0],
      email: memberEmail,
      role,
    },
    token,
  };
}

/**
 * 로그아웃 — 서버의 refresh 토큰을 무효화한다. (best-effort: 실패해도 로컬 세션은 정리한다)
 * 백엔드는 쿠키의 refreshToken을 읽으므로 credentials: 'include'로 호출한다.
 * TODO(api): 쿠키를 못 싣는 모바일 환경 대응은 백엔드 협의 후 보완.
 */
export async function logoutMember(): Promise<void> {
  if (USE_MOCK) return;
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
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

  // 백엔드: { cartId(number), qrCode, status } 반환
  // 이후 SSE/수량/삭제 전부 qrCode 기준이므로 세션 식별자 qrCode로 사용.
  const res = await apiFetch<{ cartId: number; qrCode: string; status: string }>('/api/carts/connect', {
    method: 'POST',
    body: JSON.stringify({ qrCode: trimmed }),
  });
  return { cartId: res.qrCode };
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
