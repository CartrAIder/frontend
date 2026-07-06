/**
 * 디자인 토큰 — 일반인(normal) / 노약자(senior) 두 벌.
 *
 * 화면 컴포넌트는 절대 폰트 크기·색상을 하드코딩하지 않는다.
 * 반드시 useTheme()로 현재 모드의 토큰을 읽어 쓴다.
 *
 * NOTE(Sprint 1): 색상 팔레트·간격 스케일은 Sprint 1에서 목업 기준으로 확정한다.
 * 여기서는 Sprint 0 골격만 정의한다.
 */

export type Mode = 'normal' | 'senior';

export interface ModeColors {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  success: string;
  successSurface: string;
  warningSurface: string;
  warningText: string;
}

export interface ModeTokens {
  /** 본문 기본 글자 크기 */
  fontBody: number;
  /** 버튼 라벨 글자 크기 */
  fontButton: number;
  /** 금액 등 강조 글자 크기 */
  fontAmount: number;
  /** 제목 글자 크기 */
  fontTitle: number;
  /** 터치 요소 최소 높이 */
  minTouch: number;
  /** 기본 여백 단위 */
  spacing: number;
  /** 음성 안내 제공 여부 (결제 완료·길 안내) */
  voiceGuide: boolean;
  /** 모드별 색상 팔레트 (senior는 WCAG AA 4.5:1 이상 고대비) */
  colors: ModeColors;
}

export const tokens: Record<Mode, ModeTokens> = {
  normal: {
    fontBody: 15,
    fontButton: 18,
    fontAmount: 20,
    fontTitle: 24,
    minTouch: 44,
    spacing: 12,
    voiceGuide: false,
    colors: {
      background: '#FFFFFF',
      surface: '#F3F4F6',
      border: '#E5E7EB',
      text: '#111827',
      textMuted: '#6B7280',
      primary: '#2563EB',
      primaryText: '#FFFFFF',
      success: '#16A34A',
      successSurface: '#DCFCE7',
      warningSurface: '#FEF3C7',
      warningText: '#92400E',
    },
  },
  senior: {
    fontBody: 18,
    fontButton: 24,
    fontAmount: 30,
    fontTitle: 30,
    minTouch: 56,
    spacing: 16,
    voiceGuide: true,
    colors: {
      background: '#FFFFFF',
      surface: '#F5F5F5',
      border: '#4B5563',
      text: '#000000',
      textMuted: '#374151',
      primary: '#1D4ED8',
      primaryText: '#FFFFFF',
      success: '#15803D',
      successSurface: '#BBF7D0',
      warningSurface: '#FDE68A',
      warningText: '#78350F',
    },
  },
};
