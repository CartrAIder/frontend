/**
 * secure-store 기반 인증 정보 저장소.
 *
 * lib/api.ts(요청 시 JWT 첨부)와 context/AuthContext.tsx(로그인 상태 관리)가
 * 같은 저장 키를 공유하기 위한 헬퍼. 순환 참조를 피하려고 별도 모듈로 분리했다.
 */
import * as SecureStore from 'expo-secure-store';

const AUTH_STORAGE_KEY = 'cartraider.auth';

export interface StoredAuth {
  cartId: string;
  token: string;
}

export async function loadAuth(): Promise<StoredAuth | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export async function saveAuth(auth: StoredAuth): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(auth));
  } catch {
    // 저장 실패는 무시 — 현재 세션의 로그인 상태에는 영향 없음.
  }
}

export async function clearAuth(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
  } catch {
    // 삭제 실패는 무시.
  }
}
