/**
 * 반응형 레이아웃 계산 — 상품 그리드·가로 레일의 카드 폭을 화면 폭에서 뽑는다.
 *
 * ⚠️ `Dimensions.get('window')`를 모듈 최상위에서 읽으면 안 된다.
 *  - 웹에서는 번들 평가 시점이 레이아웃 이전이라 0에 가까운 값이 잡히고,
 *    그 값으로 계산한 카드 폭(음수/한 자리)이 그대로 굳어 카드가 찌그러진다.
 *  - 창 크기를 바꿔도 다시 계산되지 않아 이미지가 컨테이너를 넘치거나 반대로 쪼그라든다.
 * 그래서 리렌더를 일으키는 `useWindowDimensions()`만 사용한다.
 */
import { useWindowDimensions } from 'react-native';

/** 화면 좌우 여백 기본값 — 화면들이 쓰는 GUTTER와 같다. */
export const DEFAULT_GUTTER = 20;

/** 웹 첫 프레임에서 0이 잡힐 때 쓸 기본 폭(일반적인 폰 세로). */
const FALLBACK_WIDTH = 375;

/** 카드가 이보다 넓어지면 열을 늘린다 — 데스크톱에서 카드 한 장이 화면을 뒤덮는 걸 막는다. */
const MAX_CARD_WIDTH = { normal: 260, senior: 420 };

/** 좌우 여백을 뺀 실제 콘텐츠 폭. */
export function useContentWidth(gutter: number = DEFAULT_GUTTER): number {
  const { width } = useWindowDimensions();
  const safe = width > 0 ? width : FALLBACK_WIDTH;
  // 아주 좁은 창에서도 카드가 음수 폭이 되지 않도록 하한을 둔다.
  return Math.max(safe - gutter * 2, 240);
}

export interface ProductGridMetrics {
  /** 좌우 여백을 뺀 콘텐츠 폭. */
  contentWidth: number;
  /** 실제로 그릴 열 수 — 화면이 넓으면 baseColumns보다 늘어난다. */
  columns: number;
  /** 그리드 카드 한 장의 폭. */
  cardWidth: number;
  /** 가로 스크롤 레일 카드 폭. */
  railCardWidth: number;
}

/**
 * 상품 그리드 치수.
 *
 * `baseColumns`는 접근성 모드에서 오는 최소 열 수(일반 2 / 노약자 1)다.
 * 폰 폭에서는 이 값이 그대로 쓰이고, 태블릿·데스크톱 웹처럼 넓어지면
 * 카드가 `MAX_CARD_WIDTH`를 넘지 않는 선에서 열을 늘린다.
 */
export function useProductGrid(
  baseColumns: number,
  gap: number,
  gutter: number = DEFAULT_GUTTER,
): ProductGridMetrics {
  const contentWidth = useContentWidth(gutter);
  const maxCard = baseColumns <= 1 ? MAX_CARD_WIDTH.senior : MAX_CARD_WIDTH.normal;

  let columns = Math.max(baseColumns, 1);
  // 한 장이 너무 넓어지면 열을 하나씩 늘린다(8열에서 멈춰 무한 루프를 막는다).
  while (columns < 8 && (contentWidth - gap * (columns - 1)) / columns > maxCard) {
    columns += 1;
  }

  const cardWidth = Math.max(Math.floor((contentWidth - gap * (columns - 1)) / columns), 1);
  // 레일은 "2.4장쯤 보이게"가 기본이지만, 넓은 화면에서 카드가 커지지 않도록 상한을 건다.
  const railCardWidth = Math.max(Math.round(Math.min(contentWidth / 2.4, maxCard)), 1);

  return { contentWidth, columns, cardWidth, railCardWidth };
}

/**
 * 풀블리드(좌우 여백 없이 꽉 채우는) 정사각 이미지의 한 변.
 * 넓은 화면에서 화면 높이를 다 잡아먹지 않도록 상한을 둔다.
 */
export function useHeroSize(maxSize = 520): number {
  const { width } = useWindowDimensions();
  const safe = width > 0 ? width : FALLBACK_WIDTH;
  return Math.min(safe, maxSize);
}
