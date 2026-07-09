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

const MEMBER_STORAGE_KEY = 'cartraider.member';
const ACCOUNT_STORAGE_KEY = 'cartraider.account';

/** 로그인된 회원 세션(앱 재시작 후에도 유지). */
export interface MemberSession {
  id: string;
  name: string;
  email: string;
  token: string;
}

/** 회원가입 시 로컬에 저장하는 자격 증명(로그인 시 대조용, mock 전용). */
export interface RegisteredAccount {
  name: string;
  email: string;
  password: string;
}

export async function loadMemberSession(): Promise<MemberSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(MEMBER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MemberSession) : null;
  } catch {
    return null;
  }
}

export async function saveMemberSession(session: MemberSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(MEMBER_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // 저장 실패는 무시 — 현재 세션의 로그인 상태에는 영향 없음.
  }
}

export async function clearMemberSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(MEMBER_STORAGE_KEY);
  } catch {
    // 삭제 실패는 무시.
  }
}

export async function loadAccount(): Promise<RegisteredAccount | null> {
  try {
    const raw = await SecureStore.getItemAsync(ACCOUNT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RegisteredAccount) : null;
  } catch {
    return null;
  }
}

export async function saveAccount(account: RegisteredAccount): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  } catch {
    // 저장 실패는 무시.
  }
}

export async function clearAccount(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCOUNT_STORAGE_KEY);
  } catch {
    // 삭제 실패는 무시.
  }
}
