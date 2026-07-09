/**
 * 회원 인증 상태 — mock 로컬 계정 로그인.
 *
 * "카트 연결(QR)"과는 분리된 개념이다. 회원 로그인은 앱을 재시작해도
 * 로그아웃 전까지 유지되며, 카트 세션(CartSessionContext)은 그 위에서 독립적으로 열린다.
 * 로그인 성공 시 받은 세션(토큰 포함)을 secure-store에 저장해 재시작 후에도 복원한다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { loginMember, signupMember, toSession, type SignupInput } from '@/lib/api';
import { clearMemberSession, loadMemberSession, saveMemberSession, type MemberSession } from '@/lib/authStorage';

export type Member = Pick<MemberSession, 'id' | 'name' | 'email'>;

interface AuthContextValue {
  member: Member | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MemberSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    loadMemberSession()
      .then(setSession)
      .finally(() => setIsRestoring(false));
  }, []);

  const applySession = useCallback(async (next: MemberSession) => {
    setSession(next);
    await saveMemberSession(next);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMember(email, password);
      await applySession(toSession(result));
    },
    [applySession],
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const result = await signupMember(input);
      await applySession(toSession(result));
    },
    [applySession],
  );

  const logout = useCallback(() => {
    setSession(null);
    clearMemberSession().catch(() => {
      // 삭제 실패는 무시 — 메모리 상 상태는 이미 초기화됨.
      // 카트 세션/장바구니 정리는 하위 Provider가 로그아웃을 감지해 캐스케이드로 처리한다.
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      member: session ? { id: session.id, name: session.name, email: session.email } : null,
      isAuthenticated: session !== null,
      isRestoring,
      token: session?.token ?? null,
      login,
      signup,
      logout,
    }),
    [session, isRestoring, login, signup, logout],
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
