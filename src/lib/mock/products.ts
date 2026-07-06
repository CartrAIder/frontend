/** 시연용 mock 상품 카탈로그 — 실제 AI 인식 파이프라인이 붙기 전까지 사용한다. */

export interface Product {
  id: string;
  name: string;
  unitPrice: number;
  icon: string;
  /** Sprint 5 매장 길 안내에서 사용할 매장 구역. */
  zone: string;
  /** 카트 근처 할인 이벤트 (있는 상품만). */
  discountPercent?: number;
}

export const PRODUCT_CATALOG: Product[] = [
  {
    id: 'milk-seoul-1l',
    name: '서울우유 1L',
    unitPrice: 2400,
    icon: '🥛',
    zone: '유제품',
    discountPercent: 10,
  },
  { id: 'tuna-dongwon', name: '참치캔 (동원)', unitPrice: 1800, icon: '🥫', zone: '가공식품' },
  { id: 'bread-samlip', name: '식빵 (삼립)', unitPrice: 3200, icon: '🍞', zone: '제과' },
  { id: 'water-samdasu-2l', name: '삼다수 2L', unitPrice: 1200, icon: '💧', zone: '음료' },
];

export function findProduct(productId: string): Product | undefined {
  return PRODUCT_CATALOG.find((product) => product.id === productId);
}
