/** 시연용 간이 매장 지도 — 3열 그리드 좌표를 가진 구역 목록. */

export interface StoreZone {
  /** products.ts의 Product.zone과 매칭되는 id (계산대 등 상품 없는 구역은 임의 id). */
  id: string;
  label: string;
  row: number;
  col: number;
  colSpan?: number;
  color: string;
}

export const STORE_ZONES: StoreZone[] = [
  { id: 'produce', label: '야채/과일', row: 0, col: 0, color: '#DCFCE7' },
  { id: '유제품', label: '유제품', row: 0, col: 1, color: '#DBEAFE' },
  { id: '음료', label: '음료', row: 0, col: 2, color: '#FEF9C3' },
  { id: '가공식품', label: '가공식품', row: 1, col: 0, color: '#FDE68A' },
  { id: 'frozen', label: '냉동식품', row: 1, col: 1, color: '#E0E7FF' },
  { id: '제과', label: '제과', row: 1, col: 2, color: '#FCE7F3' },
  { id: 'checkout', label: '계산대/입출구', row: 2, col: 0, colSpan: 3, color: '#E5E7EB' },
];

export const GRID_ROWS = 3;
export const GRID_COLS = 3;

/** 고객의 현재 위치로 가정하는 구역 (입구 근처). */
export const CURRENT_ZONE_ID = 'checkout';

export function findZone(zoneId: string): StoreZone | undefined {
  return STORE_ZONES.find((zone) => zone.id === zoneId);
}
