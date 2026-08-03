/**
 * 회원 인증 상태 — mock 로컬 계정 로그인.
 *
 * "카트 연결(QR)"과는 분리된 개념이다. 회원 로그인은 앱을 재시작해도
 * 로그아웃 전까지 유지되며, 카트 세션(CartSessionContext)은 그 위에서 독립적으로 열린다.
 * 로그인 성공 시 받은 세션(토큰 포함)을 secure-store에 저장해 재시작 후에도 복원한다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isTokenExpired, loginMember, logoutMember, reissueSession, signupMember, toSession, type SignupInput } from '@/lib/api';
import { clearMemberSession, loadMemberSession, saveMemberSession, type MemberSession } from '@/lib/authStorage';

export type Member = Pick<MemberSession, 'id' | 'name' | 'email' | 'role'>;

interface AuthContextValue {
  member: Member | null;
  isAuthenticated: boolean;
  /** 관리자 계정 여부 — 홈의 관리자 버튼·`/admin` 라우트 가드가 이 값을 본다. */
  isAdmin: boolean;
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
    let active = true;
    (async () => {
      try {
        const restored = await loadMemberSession();
        if (!restored) return;
        // 액세스 토큰이 아직 유효하면 그대로 복원한다.
        if (!isTokenExpired(restored.token)) {
          if (active) setSession(restored);
          return;
        }
        // 만료됐으면 저장된 refresh 토큰으로 재발급을 시도한다(성공 시 세션 유지).
        const refreshed = await reissueSession();
        if (refreshed) {
          if (active) setSession(refreshed);
          return;
        }
        // refresh 토큰까지 만료/부재면 세션을 폐기(자동 로그아웃)한다.
        await clearMemberSession().catch(() => {});
        if (active) setSession(null);
      } finally {
        if (active) setIsRestoring(false);
      }
    })();
    return () => {
      active = false;
    };
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
    // 서버 refresh 토큰 무효화(best-effort) — 실패해도 로컬 로그아웃은 진행.
    logoutMember().catch(() => {});
    setSession(null);
    clearMemberSession().catch(() => {
      // 삭제 실패는 무시 — 메모리 상 상태는 이미 초기화됨.
      // 카트 세션/장바구니 정리는 하위 Provider가 로그아웃을 감지해 캐스케이드로 처리한다.
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      member: session
        ? { id: session.id, name: session.name, email: session.email, role: session.role }
        : null,
      isAuthenticated: session !== null,
      isAdmin: session?.role === 'admin',
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
