/**
 * 상품 일러스트 사양 — 상품 하나를 어떤 그림으로 그릴지 정한다.
 *
 * 실제 상품 사진은 저작권 때문에 쓸 수 없어서, 상품명 키워드로 종류를 고르고
 * 상품 id 해시로 색을 변주해 벡터 일러스트를 그린다. 번들에 포함되므로
 * 네트워크 없이도 항상 뜨고, 어떤 해상도에서도 깨지지 않는다.
 *
 * 실제 상품 이미지 API가 생기면 ProductImage 가 imageUrl 을 우선 쓰도록 바꾸면 된다.
 */

/** 그릴 수 있는 일러스트 종류. */
export type ArtKind =
  | 'apple'
  | 'banana'
  | 'tomato'
  | 'leaf'
  | 'milk'
  | 'yogurt'
  | 'cheese'
  | 'egg'
  | 'bottle'
  | 'can'
  | 'ramen'
  | 'cupNoodle'
  | 'riceBowl'
  | 'tin'
  | 'meat'
  | 'bread'
  | 'snack'
  | 'iceCream'
  | 'frozen'
  | 'detergent'
  | 'tissue'
  | 'paw'
  | 'box';

export interface ArtSpec {
  kind: ArtKind;
  /** 카드 배경(연한 톤). */
  bg: string;
  /** 오브젝트 주색. */
  main: string;
  /** 오브젝트 보조색(뚜껑·그림자 등). */
  accent: string;
}

/**
 * 상품명 키워드 → 일러스트 종류.
 * 앞에 있는 규칙이 우선한다(예: "딸기우유"는 우유로 잡혀야 하므로 과일보다 유제품을 먼저 본다).
 */
const KEYWORD_RULES: { kind: ArtKind; words: string[] }[] = [
  { kind: 'milk', words: ['우유', '멸균유'] },
  { kind: 'yogurt', words: ['요거트', '요구르트', '요플레'] },
  { kind: 'cheese', words: ['치즈'] },
  { kind: 'egg', words: ['계란', '달걀'] },
  { kind: 'cupNoodle', words: ['컵라면', '컵누들'] },
  { kind: 'ramen', words: ['라면', '짜파게티', '면'] },
  { kind: 'riceBowl', words: ['즉석밥', '햇반', '밥'] },
  { kind: 'tin', words: ['참치', '스팸', '캔햄', '통조림'] },
  { kind: 'meat', words: ['삼겹살', '목살', '소고기', '돼지', '닭가슴살', '훈제오리', '불고기', '정육'] },
  { kind: 'iceCream', words: ['아이스크림', '빙과'] },
  { kind: 'frozen', words: ['냉동', '만두', '피자'] },
  { kind: 'snack', words: ['감자칩', '초코파이', '쿠키', '과자', '스낵'] },
  { kind: 'bread', words: ['빵', '식빵', '베이글', '케이크'] },
  { kind: 'can', words: ['콜라', '사이다', '아메리카노', '이온음료', '탄산'] },
  { kind: 'bottle', words: ['생수', '삼다수', '주스', '음료', '올리브유', '식용유'] },
  { kind: 'apple', words: ['사과'] },
  { kind: 'banana', words: ['바나나'] },
  { kind: 'tomato', words: ['토마토'] },
  { kind: 'leaf', words: ['김치', '콩나물', '양파', '감자', '두부', '채소', '나물', '김', '샐러드'] },
  { kind: 'detergent', words: ['세제', '샴푸', '치약', '주방', '세탁'] },
  { kind: 'tissue', words: ['화장지', '물티슈', '휴지', '마스크', '칫솔'] },
  { kind: 'paw', words: ['사료', '반려', '고양이', '강아지'] },
];

/** 매대 구역별 기본값 — 키워드가 안 걸릴 때 쓴다. */
const ZONE_FALLBACK: Record<string, ArtKind> = {
  fresh: 'leaf',
  dairy: 'milk',
  beverage: 'bottle',
  packaged: 'tin',
  frozen: 'frozen',
  bakery: 'snack',
};

/** 일러스트 종류별 색 팔레트 (배경, 주색, 보조색). */
const PALETTE: Record<ArtKind, [string, string, string]> = {
  apple: ['#FEE2E2', '#EF4444', '#16A34A'],
  banana: ['#FEF9C3', '#FACC15', '#A16207'],
  tomato: ['#FFE4E6', '#F43F5E', '#16A34A'],
  leaf: ['#DCFCE7', '#22C55E', '#15803D'],
  milk: ['#DBEAFE', '#FFFFFF', '#3B82F6'],
  yogurt: ['#EDE9FE', '#FFFFFF', '#8B5CF6'],
  cheese: ['#FEF3C7', '#FBBF24', '#D97706'],
  egg: ['#FEF9C3', '#FFFBEB', '#F59E0B'],
  bottle: ['#E0F2FE', '#BAE6FD', '#0EA5E9'],
  can: ['#FEE2E2', '#DC2626', '#7F1D1D'],
  ramen: ['#FFEDD5', '#EA580C', '#9A3412'],
  cupNoodle: ['#FFE4E6', '#E11D48', '#881337'],
  riceBowl: ['#F1F5F9', '#FFFFFF', '#64748B'],
  tin: ['#E2E8F0', '#94A3B8', '#475569'],
  meat: ['#FFE4E6', '#FB7185', '#BE123C'],
  bread: ['#FEF3C7', '#D97706', '#92400E'],
  snack: ['#FCE7F3', '#EC4899', '#9D174D'],
  iceCream: ['#E0E7FF', '#A5B4FC', '#4F46E5'],
  frozen: ['#E0F2FE', '#7DD3FC', '#0369A1'],
  detergent: ['#CFFAFE', '#06B6D4', '#0E7490'],
  tissue: ['#F1F5F9', '#FFFFFF', '#94A3B8'],
  paw: ['#FEF3C7', '#F59E0B', '#B45309'],
  box: ['#F1F5F9', '#CBD5E1', '#64748B'],
};

/** 문자열 → 안정적인 양수 해시. 같은 상품은 항상 같은 변주를 받는다. */
function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** HEX 색을 hue 기준으로 살짝 돌린다(같은 종류 상품이 전부 똑같아 보이지 않게). */
function shift(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 0xff) + amount);
  const g = clamp(((n >> 8) & 0xff) + Math.round(amount * 0.6));
  const b = clamp((n & 0xff) + Math.round(amount * 0.2));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** 상품 하나의 일러스트 사양을 구한다. */
export function artFor(input: { id: string; name: string; zone?: string }): ArtSpec {
  const name = input.name ?? '';
  const matched = KEYWORD_RULES.find((rule) => rule.words.some((w) => name.includes(w)));
  const kind: ArtKind = matched?.kind ?? ZONE_FALLBACK[input.zone ?? ''] ?? 'box';

  const [bg, main, accent] = PALETTE[kind];
  // -12 ~ +12 범위로 흔들어 같은 종류라도 조금씩 다른 색을 준다.
  const delta = (hash(input.id) % 25) - 12;

  return { kind, bg, main: shift(main, delta), accent };
}
