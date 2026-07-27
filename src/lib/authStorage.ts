/**
 * secure-store 기반 회원 인증 저장소.
 *
 * "회원 세션"(로그인 상태)과 "등록된 계정"(회원가입 시 저장한 자격 증명)을 각각
 * 다른 키로 보관한다. lib/api.ts(요청 시 회원 JWT 첨부)와
 * context/AuthContext.tsx(회원 로그인 상태 관리)가 같은 키를 공유하기 위한 헬퍼로,
 * 순환 참조를 피하려고 별도 모듈로 분리했다.
 *
 * 백엔드 미확정이라 mock으로 동작한다. 실서버가 붙으면 계정 검증은 서버가 하고
 * 이 모듈은 세션 토큰만 보관하면 된다(등록 계정 키는 제거 가능).
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const MEMBER_STORAGE_KEY = 'cartraider.member';
const ACCOUNT_STORAGE_KEY = 'cartraider.account';

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
  token: string;
  role: MemberRole;
}

/** 회원가입 시 로컬에 저장하는 자격 증명(로그인 시 대조용, mock 전용). */
export interface RegisteredAccount {
  name: string;
  email: string;
  password: string;
}

export async function loadMemberSession(): Promise<MemberSession | null> {
  try {
    const raw = await storage.getItem(MEMBER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MemberSession;
    // role 도입 이전에 저장된 세션은 일반 회원으로 간주한다.
    return { ...parsed, role: parsed.role === 'admin' ? 'admin' : 'user' };
  } catch {
    return null;
  }
}

export async function saveMemberSession(session: MemberSession): Promise<void> {
  try {
    await storage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // 저장 실패는 무시 — 현재 세션의 로그인 상태에는 영향 없음.
  }
}

export async function clearMemberSession(): Promise<void> {
  try {
    await storage.removeItem(MEMBER_STORAGE_KEY);
  } catch {
    // 삭제 실패는 무시.
  }
}

export async function loadAccount(): Promise<RegisteredAccount | null> {
  try {
    const raw = await storage.getItem(ACCOUNT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RegisteredAccount) : null;
  } catch {
    return null;
  }
}

export async function saveAccount(account: RegisteredAccount): Promise<void> {
  try {
    await storage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  } catch {
    // 저장 실패는 무시.
  }
}

export async function clearAccount(): Promise<void> {
  try {
    await storage.removeItem(ACCOUNT_STORAGE_KEY);
  } catch {
    // 삭제 실패는 무시.
  }
}
