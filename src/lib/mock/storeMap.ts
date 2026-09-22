/**
 * 시연용 간이 매장 지도 — 3열 그리드 좌표를 가진 구역 목록.
 *
 * products.ts와 마찬가지로 여기 배열은 **초기 시드**다. 실제 구역 데이터는
 * `context/CatalogContext`가 들고 있고 관리자 페이지의 "매장 지도 편집"에서 수정한다.
 * row 0~1(6칸)은 매대 선반, row 2는 계산대/출구 영역으로 렌더링된다.
 */

import type { IconName } from '@/components/Icon';

export interface StoreZone {
  /** products.ts의 Product.zone과 매칭되는 id. */
  id: string;
  label: string;
  row: number;
  col: number;
  colSpan?: number;
  color: string;
  /** 지도·칩에 표시할 이모지 아이콘. */
  icon: string;
}

/**
 * 매대 6칸. 백엔드 상품 구성(식품·음료·생활·디지털·뷰티·패션/취미)에 맞춰 잡았다.
 * 카테고리 → 구역 매핑은 `lib/catalog/overlay.ts`의 CATEGORY_ZONE이 담당한다.
 */
export const DEFAULT_ZONES: StoreZone[] = [
  { id: 'food', label: '식품', row: 0, col: 0, color: '#DCFCE7', icon: '🍚' },
  { id: 'beverage', label: '음료', row: 0, col: 1, color: '#FEF9C3', icon: '🥤' },
  { id: 'household', label: '생활용품', row: 0, col: 2, color: '#E0E7FF', icon: '🧴' },
  { id: 'digital', label: '디지털/가전', row: 1, col: 0, color: '#DBEAFE', icon: '🔌' },
  { id: 'beauty', label: '화장품/미용', row: 1, col: 1, color: '#FCE7F3', icon: '💄' },
  { id: 'leisure', label: '패션/취미', row: 1, col: 2, color: '#FDE68A', icon: '🎒' },
  {
    id: 'checkout',
    label: '계산대/입출구',
    row: 2,
    col: 0,
    colSpan: 3,
    color: '#E5E7EB',
    icon: '🧾',
  },
];

/** 매대로 배치할 수 있는 칸 (row 0~1 × col 0~2). 관리자 지도 편집기의 슬롯이다. */
export const SHELF_ROWS = 2;
export const GRID_ROWS = 3;
export const GRID_COLS = 3;

/** 관리자 지도 편집에서 고를 수 있는 구역 색상 팔레트. */
export const ZONE_COLOR_PALETTE = [
  '#DCFCE7',
  '#DBEAFE',
  '#FEF9C3',
  '#FDE68A',
  '#E0E7FF',
  '#FCE7F3',
  '#FEE2E2',
  '#E5E7EB',
];

/** 고객의 현재 위치로 가정하는 구역 (입구 근처). */
export const CURRENT_ZONE_ID = 'checkout';

/**
 * 구역 id → 선 아이콘. 이모지는 기기·OS마다 모양이 달라 상업 앱처럼 보이지 않아서,
 * 화면에는 `components/Icon`의 같은 굵기 아이콘을 쓴다. (StoreZone.icon 이모지는
 * 관리자 편집·목록의 보조 표시로만 남는다)
 */
export const ZONE_ICON: Record<string, IconName> = {
  food: 'zoneFood',
  beverage: 'zoneBeverage',
  household: 'zoneHousehold',
  digital: 'zoneDigital',
  beauty: 'zoneBeauty',
  leisure: 'zoneLeisure',
  checkout: 'zoneCheckout',
};

/** 관리자가 새로 만든 구역처럼 매핑이 없으면 중립 아이콘으로 떨어진다. */
export function zoneIconName(zoneId: string): IconName {
  return ZONE_ICON[zoneId] ?? 'box';
}

export function findZoneIn(zones: StoreZone[], zoneId: string): StoreZone | undefined {
  return zones.find((zone) => zone.id === zoneId);
}

/** 기존 코드 호환용 별칭 — 새 코드는 `useCatalog().zones`를 쓴다. */
export const STORE_ZONES = DEFAULT_ZONES;

export function findZone(zoneId: string): StoreZone | undefined {
  return findZoneIn(DEFAULT_ZONES, zoneId);
}
