/**
 * 시연용 mock 상품 카탈로그 — 실제 AI 인식 파이프라인/상품 API가 붙기 전까지 사용한다.
 *
 * 여기 있는 배열은 **초기 시드(seed)** 일 뿐이다. 앱이 실제로 읽고 쓰는 카탈로그는
 * `context/CatalogContext`가 들고 있으며(관리자 페이지에서 등록·수정 가능), 이 시드로
 * 최초 1회 채워진 뒤 secure-store에 영속화된다.
 * TODO(api): Sprint 6에서 `GET /api/products`로 교체.
 */

export interface Product {
  /** 화면/카트 공통 키. 하이브리드에서는 백엔드 상품의 barcode(로컬 추가 상품은 local-…). */
  id: string;
  name: string;
  unitPrice: number;
  icon: string;
  /** 매장 구역 id — `mock/storeMap.ts`의 StoreZone.id와 매칭된다. 카테고리 필터로도 쓴다. */
  zone: string;
  /** 카트 근처 할인 이벤트 (있는 상품만). */
  discountPercent?: number;
  /** 재고 수량 — 0이면 품절로 표시한다. */
  stock: number;
  /** 상품 상세 화면에 보여줄 한 줄 설명. */
  description?: string;
  brand?: string;
  /** 백엔드 상품 id(Long). 관리자 수정/삭제 시 서버 호출에 쓴다. 로컬 전용 상품엔 없다. */
  backendId?: number;
  /** 백엔드 카테고리(한글). 오버레이가 매대 구역·아이콘을 파생하는 근거. */
  category?: string;
  /** 백엔드 판매 상태(ON_SALE / SOLD_OUT). */
  status?: string;
}

export const DEFAULT_PRODUCTS: Product[] = [
  // ── 야채/과일 ──
  { id: 'apple-bag', name: '사과 (봉지)', unitPrice: 8900, icon: '🍎', zone: 'fresh', stock: 24, brand: '산지직송', description: '아침 대용으로 좋은 새콤달콤한 부사 사과 5입.' },
  { id: 'banana-dole', name: '바나나 (한 송이)', unitPrice: 3980, icon: '🍌', zone: 'fresh', stock: 31, brand: 'Dole', description: '후숙된 상태로 입고되어 바로 드실 수 있어요.' },
  { id: 'tomato-cherry', name: '방울토마토 500g', unitPrice: 5400, icon: '🍅', zone: 'fresh', stock: 12, discountPercent: 15, description: '샐러드·도시락 반찬으로 인기 있는 대추방울토마토.' },

  // ── 유제품 ──
  { id: 'milk-seoul-1l', name: '서울우유 1L', unitPrice: 2400, icon: '🥛', zone: 'dairy', stock: 40, discountPercent: 10, brand: '서울우유', description: '1등급 원유로 만든 흰 우유. 개봉 후 냉장 보관.' },
  { id: 'yogurt-greek', name: '그릭요거트 400g', unitPrice: 4900, icon: '🍶', zone: 'dairy', stock: 18, brand: '덴마크', description: '무가당 그릭요거트. 단백질 함량이 높아요.' },
  { id: 'cheese-slice', name: '체다 슬라이스 치즈 10매', unitPrice: 3600, icon: '🧀', zone: 'dairy', stock: 0, brand: '매일', description: '토스트·샌드위치용 낱개 포장 치즈.' },

  // ── 음료 ──
  { id: 'water-samdasu-2l', name: '삼다수 2L', unitPrice: 1200, icon: '💧', zone: 'beverage', stock: 96, brand: '제주삼다수', description: '제주 화산암반수 생수 2L 낱개.' },
  { id: 'cola-1-5l', name: '콜라 1.5L', unitPrice: 2900, icon: '🥤', zone: 'beverage', stock: 27, discountPercent: 20, brand: '코카콜라', description: '패밀리 사이즈 페트. 2개 이상 구매 시 할인.' },
  { id: 'americano-can', name: '캔 아메리카노 275ml', unitPrice: 1500, icon: '☕️', zone: 'beverage', stock: 55, brand: '칸타타', description: '무설탕 블랙 커피. 차갑게 드시면 더 좋아요.' },

  // ── 가공식품 ──
  { id: 'tuna-dongwon', name: '참치캔 (동원)', unitPrice: 1800, icon: '🥫', zone: 'packaged', stock: 62, brand: '동원', description: '살코기 참치 100g. 김치찌개·김밥용.' },
  { id: 'rice-instant-3', name: '즉석밥 3입', unitPrice: 4200, icon: '🍚', zone: 'packaged', stock: 33, brand: '햇반', description: '전자레인지 2분이면 바로 먹는 흰쌀밥.' },
  { id: 'ramen-5pack', name: '라면 5개입', unitPrice: 4300, icon: '🍜', zone: 'packaged', stock: 21, discountPercent: 10, brand: '농심', description: '얼큰한 국물의 스테디셀러 봉지라면 멀티팩.' },

  // ── 냉동식품 ──
  { id: 'dumpling-frozen', name: '냉동 만두 400g', unitPrice: 5900, icon: '🥟', zone: 'frozen', stock: 15, brand: 'CJ', description: '고기·김치 두 가지 맛. 에어프라이어 조리 가능.' },
  { id: 'icecream-vanilla', name: '아이스크림 (바닐라) 474ml', unitPrice: 7900, icon: '🍨', zone: 'frozen', stock: 8, brand: '하겐다즈', description: '진한 바닐라빈 아이스크림 파인트.' },
  { id: 'pizza-frozen', name: '냉동 피자 (콤비네이션)', unitPrice: 6500, icon: '🍕', zone: 'frozen', stock: 0, description: '오븐 12분이면 완성되는 1인용 피자.' },

  // ── 제과/스낵 ──
  { id: 'bread-samlip', name: '식빵 (삼립)', unitPrice: 3200, icon: '🍞', zone: 'bakery', stock: 19, brand: '삼립', description: '두툼한 식빵 6매. 당일 입고 상품.' },
  { id: 'cookie-choco', name: '초코칩 쿠키 12개입', unitPrice: 3900, icon: '🍪', zone: 'bakery', stock: 26, description: '개별 포장되어 나눠 먹기 좋아요.' },
  { id: 'chips-potato', name: '감자칩 오리지널', unitPrice: 1700, icon: '🥔', zone: 'bakery', stock: 44, discountPercent: 25, brand: '포카칩', description: '얇게 썰어 바삭하게 튀긴 감자 스낵.' },
];

/**
 * 시드 카탈로그에서 상품을 찾는다.
 * 화면/관리자 기능은 항상 `useCatalog()`를 쓰고, 이 함수는 시드에만 의존해도 되는
 * mock SSE 스캔 스크립트 등 Context 밖 코드에서만 사용한다.
 */
export function findProduct(productId: string): Product | undefined {
  return DEFAULT_PRODUCTS.find((product) => product.id === productId);
}

/** 기존 코드 호환용 별칭 — 새 코드는 `useCatalog().products`를 쓴다. */
export const PRODUCT_CATALOG = DEFAULT_PRODUCTS;
