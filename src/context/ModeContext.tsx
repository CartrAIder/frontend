/**
 * 일반인 / 노약자 모드 전역 상태.
 *
 * - 기본값은 'normal'(일반인).
 * - 토글은 첫 화면(카트 연결)에서만 조작한다.
 * - 화면은 이 모드에 따라 useTheme()로 토큰을 읽어 스타일을 바꾼다.
 *
 * NOTE(Sprint 1): secure-store에 모드 저장/복원, 토글 UI 고도화.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { tokens, type Mode, type ModeTokens } from '@/theme/tokens';

interface ModeContextValue {
  mode: Mode;
  theme: ModeTokens;
  isSenior: boolean;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('normal');

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'normal' ? 'senior' : 'normal'));
  }, []);

  const value = useMemo<ModeContextValue>(
    () => ({
      mode,
      theme: tokens[mode],
      isSenior: mode === 'senior',
      setMode,
      toggleMode,
    }),
    [mode, toggleMode],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error('useMode는 ModeProvider 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}

/** 현재 모드의 디자인 토큰만 필요할 때 쓰는 단축 훅. */
export function useTheme(): ModeTokens {
  return useMode().theme;
}
