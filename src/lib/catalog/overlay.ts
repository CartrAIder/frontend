/**
 * 하이브리드 카탈로그 — 백엔드 상품(id·바코드·이름·가격·카테고리·상태)에 앱 로컬 "표현 레이어"
 * (아이콘·매대 구역·할인·재고)를 얹어 화면이 쓰는 Product로 병합한다.
 *
 * 백엔드 상품 모델은 얇아서(매대 구역·아이콘·재고·할인 없음) 매장 지도/길 안내/할인 연출을
 * 그대로 유지하려면 이 오버레이가 필요하다. 아이콘·구역은 카테고리(+상품명)에서 파생하고,
 * 관리자가 편집한 값은 barcode 기준 오버레이로 저장돼 파생값을 덮어쓴다.
 */
import type { ApiProduct, ApiProductCategory } from '../api';
import type { Product } from '../mock/products';

/** 매장 매대 구역 id (storeMap.ts의 6개 매대와 일치). */
export type ZoneId = 'food' | 'beverage' | 'household' | 'digital' | 'beauty' | 'leisure';

/**
 * 백엔드 카테고리(ProductCategory) → 앱 6개 매대 구역. 모르는 값은 식품 매대로 보낸다.
 * 백엔드가 카테고리를 늘리면(FOOD·BEAUTY·DIGITAL_ELECTRONICS 등) 여기도 같이 채워야
 * 지도·구역 필터가 살아 있다. 빠뜨리면 전부 한 매대로 몰린다.
 */
const CATEGORY_ZONE: Record<string, ZoneId> = {
  // 식품
  FOOD: 'food',
  SNACK: 'food',
  FRUIT: 'food',
  VEGETABLE: 'food',
  FROZEN: 'food',
  // 음료
  BEVERAGE: 'beverage',
  DAIRY: 'beverage',
  // 생활용품
  HOUSEHOLD: 'household',
  KITCHENWARE: 'household',
  // 디지털/가전
  DIGITAL_ELECTRONICS: 'digital',
  // 화장품/미용
  BEAUTY: 'beauty',
  // 패션/취미
  FASHION_ACCESSORIES: 'leisure',
  TOYS_HOBBIES: 'leisure',
  SPORTS_LEISURE: 'leisure',
};

/**
 * 매대 구역 → 대표 카테고리 (관리자가 상품을 등록할 때 카테고리 기본값으로 쓴다).
 * 한 구역에 여러 카테고리가 묶이므로 그 중 가장 대표적인 하나를 고른다.
 */
const ZONE_CATEGORY: Record<ZoneId, ApiProductCategory> = {
  food: 'FOOD',
  beverage: 'BEVERAGE',
  household: 'HOUSEHOLD',
  digital: 'DIGITAL_ELECTRONICS',
  beauty: 'BEAUTY',
  leisure: 'FASHION_ACCESSORIES',
};

/** 카테고리 기본 아이콘 — 서버 사진도 번들 사진도 없을 때의 최후 표시. */
const CATEGORY_ICON: Record<string, string> = {
  FOOD: '🍚',
  SNACK: '🍪',
  FRUIT: '🍎',
  VEGETABLE: '🥬',
  FROZEN: '🧊',
  BEVERAGE: '🥤',
  DAIRY: '🥛',
  HOUSEHOLD: '🧴',
  KITCHENWARE: '🍳',
  DIGITAL_ELECTRONICS: '🔌',
  BEAUTY: '💄',
  FASHION_ACCESSORIES: '🎒',
  TOYS_HOBBIES: '🧸',
  SPORTS_LEISURE: '⚽️',
};

/** 상품명 키워드 → 아이콘 (데모 완성도용, 카테고리 기본값보다 우선). */
const NAME_ICON: [RegExp, string][] = [
  [/우유/, '🥛'], [/바나나/, '🍌'], [/사과/, '🍎'], [/토마토/, '🍅'], [/치즈/, '🧀'],
  [/계란/, '🥚'], [/커피|아메리카노/, '☕️'], [/콜라|사이다/, '🥤'], [/주스/, '🧃'],
  [/물|생수/, '💧'], [/라면/, '🍜'], [/밥/, '🍚'], [/빵|식빵/, '🍞'], [/피자/, '🍕'],
  [/만두/, '🥟'], [/아이스크림/, '🍨'], [/칩/, '🥔'], [/쿠키/, '🍪'], [/초코파이/, '🥧'],
  [/참치/, '🥫'], [/두부/, '🍶'], [/김치/, '🥬'], [/삼겹살|목살|소고기|불고기/, '🥩'],
  [/닭|치킨/, '🍗'], [/오리/, '🦆'], [/양파/, '🧅'], [/감자/, '🥔'], [/콩나물/, '🌱'],
  [/마스크/, '😷'], [/건전지/, '🔋'], [/봉투/, '🛍️'], [/치약|칫솔/, '🪥'], [/스팸/, '🥫'],
  [/김/, '🍙'], [/올리브유/, '🫒'], [/이온음료/, '🥤'], [/요구르트|요거트/, '🥛'],
];

export function iconFor(name: string, category: string): string {
  for (const [re, icon] of NAME_ICON) if (re.test(name)) return icon;
  return CATEGORY_ICON[category] ?? '🛒';
}

export function zoneFor(category: string): ZoneId {
  return CATEGORY_ZONE[category] ?? 'food';
}

export function categoryForZone(zone: string): ApiProductCategory {
  return ZONE_CATEGORY[zone as ZoneId] ?? 'FOOD';
}

/** 백엔드에 없는 필드의 기본 재고 — 관리자가 조정하기 전까지 표시용. */
const DEFAULT_STOCK = 20;

/** barcode 기준 로컬 표현 레이어. 관리자 편집·로컬 추가·로컬 삭제를 담는다. */
export interface ProductOverlay {
  icon?: string;
  zone?: string;
  discountPercent?: number | null;
  stock?: number;
  description?: string;
  brand?: string;
  /** 로컬 편집 override (백엔드 값 대신 표시). */
  name?: string;
  unitPrice?: number;
  /** 로컬 삭제 — 병합에서 제외. */
  hidden?: boolean;
  /** 백엔드에 아직 없는 로컬 전용 상품(관리자가 앱에서만 추가). */
  localOnly?: { name: string; unitPrice: number; category: string };
}

export type OverlayMap = Record<string /* barcode */, ProductOverlay>;

interface MergeBase {
  backendId?: number;
  name: string;
  unitPrice: number;
  category: string;
  status: string;
  imageUrl?: string | null;
}

function buildProduct(barcode: string, o: ProductOverlay, base: MergeBase): Product {
  const stock = o.stock ?? (base.status === 'SOLD_OUT' ? 0 : DEFAULT_STOCK);
  const discount = o.discountPercent ?? undefined;
  return {
    id: barcode,
    name: base.name,
    unitPrice: base.unitPrice,
    icon: o.icon ?? iconFor(base.name, base.category),
    zone: o.zone ?? zoneFor(base.category),
    discountPercent: discount == null ? undefined : discount,
    stock,
    description: o.description,
    brand: o.brand,
    backendId: base.backendId,
    category: base.category,
    status: base.status,
    imageUrl: base.imageUrl ?? null,
  };
}

/**
 * 백엔드 상품 목록 + 로컬 오버레이 → 화면용 Product[].
 * - 백엔드 상품에 오버레이(편집/파생)를 얹고, hidden은 제외한다.
 * - 백엔드에 없는 localOnly 오버레이는 로컬 전용 상품으로 추가한다.
 */
export function mergeCatalog(apiProducts: ApiProduct[], overlay: OverlayMap): Product[] {
  const out: Product[] = [];
  const seen = new Set<string>();
  for (const p of apiProducts) {
    seen.add(p.barcode);
    const o = overlay[p.barcode] ?? {};
    if (o.hidden) continue;
    out.push(
      buildProduct(p.barcode, o, {
        backendId: p.id,
        name: o.name ?? p.name,
        unitPrice: o.unitPrice ?? p.price,
        category: p.category,
        imageUrl: p.imageUrl,
        status: p.status,
      }),
    );
  }
  for (const [barcode, o] of Object.entries(overlay)) {
    if (seen.has(barcode) || o.hidden || !o.localOnly) continue;
    out.push(
      buildProduct(barcode, o, {
        name: o.name ?? o.localOnly.name,
        unitPrice: o.unitPrice ?? o.localOnly.unitPrice,
        category: o.localOnly.category,
        status: 'ON_SALE',
      }),
    );
  }
  return out;
}
