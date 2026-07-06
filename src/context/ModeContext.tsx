/**
 * 일반인 / 노약자 모드 전역 상태.
 *
 * - 기본값은 'normal'(일반인).
 * - 토글은 첫 화면(카트 연결)에서만 조작한다.
 * - 화면은 이 모드에 따라 useTheme()로 토큰을 읽어 스타일을 바꾼다.
 * - 선택한 모드는 secure-store에 저장되어 앱 재시작 후에도 유지된다.
 */
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { tokens, type Mode, type ModeTokens } from '@/theme/tokens';

const MODE_STORAGE_KEY = 'cartraider.mode';

function isMode(value: string | null): value is Mode {
  return value === 'normal' || value === 'senior';
}

interface ModeContextValue {
  mode: Mode;
  theme: ModeTokens;
  isSenior: boolean;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>('normal');

  useEffect(() => {
    SecureStore.getItemAsync(MODE_STORAGE_KEY)
      .then((stored) => {
        if (isMode(stored)) {
          setModeState(stored);
        }
      })
      .catch(() => {
        // 저장된 모드를 읽지 못해도 기본값(normal)으로 계속 진행한다.
      });
  }, []);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    SecureStore.setItemAsync(MODE_STORAGE_KEY, next).catch(() => {
      // 저장 실패는 무시 — 현재 세션의 모드 전환에는 영향 없음.
    });
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'normal' ? 'senior' : 'normal');
  }, [mode, setMode]);

  const value = useMemo<ModeContextValue>(
    () => ({
      mode,
      theme: tokens[mode],
      isSenior: mode === 'senior',
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode],
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
