/**
 * 카트 연결 인증 상태 — mock JWT 로그인.
 *
 * 이 앱에는 별도의 회원 로그인 화면이 없다. "카트 연결"(QR/코드) 자체가
 * 세션을 여는 로그인 동작이며, 성공 시 받은 토큰을 secure-store에 저장해
 * 앱 재시작 후에도 유지한다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { connectCart } from '@/lib/api';
import { clearAuth, loadAuth, saveAuth, type StoredAuth } from '@/lib/authStorage';

interface AuthContextValue {
  isAuthenticated: boolean;
  isRestoring: boolean;
  cartId: string | null;
  token: string | null;
  login: (code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    loadAuth()
      .then(setAuth)
      .finally(() => setIsRestoring(false));
  }, []);

  const login = useCallback(async (code: string) => {
    const result = await connectCart(code);
    setAuth(result);
    await saveAuth(result);
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
    clearAuth().catch(() => {
      // 삭제 실패는 무시 — 메모리 상 상태는 이미 초기화됨.
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: auth !== null,
      isRestoring,
      cartId: auth?.cartId ?? null,
      token: auth?.token ?? null,
      login,
      logout,
    }),
    [auth, isRestoring, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}
