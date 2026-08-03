/**
 * 하이브리드 카탈로그 — 백엔드 상품(id·바코드·이름·가격·카테고리·상태)에 앱 로컬 "표현 레이어"
 * (아이콘·매대 구역·할인·재고)를 얹어 화면이 쓰는 Product로 병합한다.
 *
 * 백엔드 상품 모델은 얇아서(매대 구역·아이콘·재고·할인 없음) 매장 지도/길 안내/할인 연출을
 * 그대로 유지하려면 이 오버레이가 필요하다. 아이콘·구역은 카테고리(+상품명)에서 파생하고,
 * 관리자가 편집한 값은 barcode 기준 오버레이로 저장돼 파생값을 덮어쓴다.
 */
import type { ApiProduct } from '../api';
import type { Product } from '../mock/products';

/** 매장 매대 구역 id (storeMap.ts의 6개 매대와 일치). */
export type ZoneId = 'fresh' | 'dairy' | 'beverage' | 'packaged' | 'frozen' | 'bakery';

/** 백엔드 11개 카테고리 → 앱 6개 매대 구역. 없는 카테고리는 packaged(가공식품)로. */
const CATEGORY_ZONE: Record<string, ZoneId> = {
  과일: 'fresh',
  채소: 'fresh',
  유제품: 'dairy',
  냉장식품: 'dairy',
  음료: 'beverage',
  식품: 'packaged',
  생활용품: 'packaged',
  반려동물: 'packaged',
  정육: 'packaged',
  냉동식품: 'frozen',
  과자: 'bakery',
};

/** 매대 구역 → 대표 카테고리 (로컬 추가 상품을 백엔드에 만들 때 카테고리 채움용). */
const ZONE_CATEGORY: Record<ZoneId, string> = {
  fresh: '과일',
  dairy: '유제품',
  beverage: '음료',
  packaged: '식품',
  frozen: '냉동식품',
  bakery: '과자',
};

/** 카테고리 기본 아이콘. */
const CATEGORY_ICON: Record<string, string> = {
  과일: '🍎',
  채소: '🥬',
  유제품: '🥛',
  냉장식품: '🧊',
  음료: '🥤',
  식품: '🥫',
  생활용품: '🧴',
  반려동물: '🐶',
  정육: '🥩',
  냉동식품: '🧊',
  과자: '🍪',
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
  return CATEGORY_ZONE[category] ?? 'packaged';
}

export function categoryForZone(zone: string): string {
  return ZONE_CATEGORY[zone as ZoneId] ?? '식품';
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
