/**
 * secure-store 기반 회원 인증 저장소.
 *
 * "회원 세션"(로그인 상태)과 "등록된 계정"(회원가입 시 저장한 자격 증명)을 각각
 * 다른 키로 보관한다. lib/api.ts(요청 시 회원 JWT 첨부)와
 * context/AuthContext.tsx(회원 로그인 상태 관리)가 같은 키를 공유하기 위한 헬퍼로,
 * 순환 참조를 피하려고 별도 모듈로 분리했다.
 *
 * 계정 검증은 서버(`/api/mobile/auth`)가 하고, 이 모듈은 로그인 세션(액세스·refresh 토큰)만 보관한다.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const MEMBER_STORAGE_KEY = 'cartraider.member';

/**
 * 저장 백엔드 추상화 — 네이티브(폰)는 expo-secure-store(OS 키체인, 암호화 저장),
 * 웹은 secure-store 미지원이라 localStorage로 폴백한다.
 * (웹 localStorage는 개발/테스트용. 실제 산출물은 모바일이라 secure-store 사용.)
 */
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

/** 회원 권한 — 'admin'만 홈에서 관리자 페이지에 들어갈 수 있다. */
export type MemberRole = 'user' | 'admin';

/** 로그인된 회원 세션(앱 재시작 후에도 유지). */
export interface MemberSession {
  id: string;
  name: string;
  email: string;
  /** 액세스 토큰(요청 헤더 첨부, 짧은 수명). */
  token: string;
  /** 리프레시 토큰(만료 시 액세스 토큰 재발급용). 구버전 세션엔 없을 수 있다. */
  refreshToken?: string;
  role: MemberRole;
}

/**
 * 메모리 캐시 — `undefined`는 "아직 안 읽음", `null`은 "읽었고 로그인 안 됨".
 *
 * api.ts의 apiFetch가 요청마다 세션을 읽는데, secure-store 한 번이 안드로이드에선
 * Keystore 복호화라 요청마다 지연이 붙는다. 세션을 바꾸는 통로가 아래 save/clear
 * 둘뿐이라 메모리에 들고 있어도 값이 어긋나지 않는다.
 */
let cachedSession: MemberSession | null | undefined;

export async function loadMemberSession(): Promise<MemberSession | null> {
  if (cachedSession !== undefined) return cachedSession;
  try {
    const raw = await storage.getItem(MEMBER_STORAGE_KEY);
    if (!raw) {
      cachedSession = null;
      return null;
    }
    const parsed = JSON.parse(raw) as MemberSession;
    // role 도입 이전에 저장된 세션은 일반 회원으로 간주한다.
    cachedSession = { ...parsed, role: parsed.role === 'admin' ? 'admin' : 'user' };
    return cachedSession;
  } catch {
    cachedSession = null;
    return null;
  }
}

export async function saveMemberSession(session: MemberSession): Promise<void> {
  // 저장이 실패해도 이번 실행 동안은 로그인 상태를 유지해야 하므로 캐시를 먼저 채운다.
  cachedSession = session;
  try {
    await storage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // 저장 실패는 무시 — 현재 세션의 로그인 상태에는 영향 없음.
  }
}

export async function clearMemberSession(): Promise<void> {
  cachedSession = null;
  try {
    await storage.removeItem(MEMBER_STORAGE_KEY);
  } catch {
    // 삭제 실패는 무시.
  }
}
