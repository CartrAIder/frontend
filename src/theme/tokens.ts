/**
 * 디자인 토큰 — 일반인(normal) / 노약자(senior) 두 벌.
 *
 * 화면 컴포넌트는 절대 폰트 크기·색상·그림자·radius를 하드코딩하지 않는다.
 * 반드시 useTheme()로 현재 모드의 토큰을 읽어 쓴다.
 *
 * 비주얼 방향: "Toss Blue" — 밝은 회색 배경 위에 흰 카드, 은은한 그림자,
 * 넉넉한 여백, 파랑(#2563EB) 브랜드. senior는 그림자 대신 강한 테두리·고대비로
 * 같은 레이아웃을 접근성 있게 표현한다.
 */

export type Mode = 'normal' | 'senior';

export interface ShadowToken {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  /** Android 그림자. */
  elevation: number;
}

export interface ModeColors {
  /** 페이지 배경 */
  background: string;
  /** 카드/시트 배경 (흰색) */
  card: string;
  /** 입력창·칩 등 옅은 채움 배경 */
  surface: string;
  /** 구분선·입력창 테두리 */
  border: string;
  /** 카드 외곽선 (normal은 거의 안 보이고 그림자로, senior는 강한 대비) */
  cardBorder: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  /** 파랑 틴트 (칩·강조 배경) */
  primarySurface: string;
  success: string;
  successSurface: string;
  warningSurface: string;
  warningText: string;
  /** 삭제·경고 액션 강조색 */
  danger: string;
  /** 할인율 강조색 — 커머스 관례상 가격 옆 빨강 계열 */
  discount: string;
  /** 리뷰 별점 색 */
  star: string;
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
  /** 히어로 숫자·대형 표시용 글자 크기 */
  fontDisplay: number;
  /** 터치 요소 최소 높이 (접근성 계약: 44 / 56) */
  minTouch: number;
  /** 주요 CTA 버튼 높이 */
  ctaHeight: number;
  /** 기본 여백 단위 */
  spacing: number;
  /** 카드 등 큰 모서리 radius */
  radius: number;
  /** 입력창·칩 등 작은 모서리 radius */
  radiusSm: number;
  /** 카드 그림자 */
  shadowCard: ShadowToken;
  /** 음성 안내 제공 여부 (결제 완료·길 안내) */
  voiceGuide: boolean;
  /** 바텀 탭바 높이(안전영역 제외) */
  tabBarHeight: number;
  /** 상품 그리드 열 수 — senior는 글자가 커서 1열로 떨어뜨린다 */
  gridColumns: number;
  /** 상품 이미지 모서리 radius */
  imageRadius: number;
  /** 모드별 색상 팔레트 (senior는 WCAG AA 4.5:1 이상 고대비) */
  colors: ModeColors;
}

export const tokens: Record<Mode, ModeTokens> = {
  normal: {
    fontBody: 15,
    fontButton: 18,
    fontAmount: 20,
    fontTitle: 24,
    fontDisplay: 30,
    minTouch: 44,
    ctaHeight: 54,
    spacing: 12,
    radius: 16,
    radiusSm: 10,
    shadowCard: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    voiceGuide: false,
    tabBarHeight: 58,
    gridColumns: 2,
    imageRadius: 12,
    colors: {
      background: '#F4F6FA',
      card: '#FFFFFF',
      surface: '#F1F3F7',
      border: '#E6E9EF',
      cardBorder: '#EEF1F6',
      text: '#111827',
      textMuted: '#6B7280',
      primary: '#2563EB',
      primaryText: '#FFFFFF',
      primarySurface: '#EAF1FE',
      success: '#16A34A',
      successSurface: '#DCFCE7',
      warningSurface: '#FEF3C7',
      warningText: '#92400E',
      danger: '#DC2626',
      discount: '#FF3B30',
      star: '#FBBF24',
    },
  },
  senior: {
    fontBody: 18,
    fontButton: 24,
    fontAmount: 30,
    fontTitle: 30,
    fontDisplay: 38,
    minTouch: 56,
    ctaHeight: 64,
    spacing: 16,
    radius: 18,
    radiusSm: 12,
    shadowCard: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    voiceGuide: true,
    tabBarHeight: 72,
    gridColumns: 1, // 글자·터치영역이 커서 2열이면 상품명이 잘린다
    imageRadius: 14,
    colors: {
      background: '#FFFFFF',
      card: '#FFFFFF',
      surface: '#F0F2F5',
      border: '#4B5563',
      cardBorder: '#4B5563',
      text: '#000000',
      textMuted: '#374151',
      primary: '#1D4ED8',
      primaryText: '#FFFFFF',
      primarySurface: '#DBEAFE',
      success: '#15803D',
      successSurface: '#BBF7D0',
      warningSurface: '#FDE68A',
      warningText: '#78350F',
      danger: '#B91C1C',
      discount: '#C81E1E',
      star: '#B45309',
    },
  },
};
