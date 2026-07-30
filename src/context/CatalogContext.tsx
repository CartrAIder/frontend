/**
 * 매장 카탈로그 전역 상태 — 상품 목록 + 매장 구역.
 *
 * 고객 화면(상품 보기·매장 지도·길 안내·오늘의 할인)과 관리자 화면(상품 등록·지도 편집)이
 * 같은 데이터를 본다. 최초 실행 시 mock 시드로 채워지고, 이후 변경분은 secure-store에
 * 영속화되어 앱을 재시작해도 유지된다.
 *
 * TODO(api): 백엔드 상품/매장 API 확정 시 CRUD 함수의 본문만 REST 호출로 교체한다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { clearCatalog, loadCatalog, saveCatalog } from '@/lib/catalogStorage';
import { DEFAULT_PRODUCTS, type Product } from '@/lib/mock/products';
import { DEFAULT_ZONES, SHELF_ROWS, findZoneIn, type StoreZone } from '@/lib/mock/storeMap';

/** 상품 등록 폼이 넘기는 값 — id는 이름에서 자동 생성한다. */
export type ProductDraft = Omit<Product, 'id'>;

interface CatalogContextValue {
  products: Product[];
  zones: StoreZone[];
  /** 매대로 배치된 구역(row 0~1)만 — 카테고리 칩·지도 선반에 쓴다. */
  shelfZones: StoreZone[];
  isRestoring: boolean;
  findProduct: (productId: string) => Product | undefined;
  findZone: (zoneId: string) => StoreZone | undefined;
  productsInZone: (zoneId: string) => Product[];
  addProduct: (draft: ProductDraft) => Product;
  updateProduct: (productId: string, patch: Partial<ProductDraft>) => void;
  removeProduct: (productId: string) => void;
  updateZone: (zoneId: string, patch: Partial<Omit<StoreZone, 'id'>>) => void;
  /** 구역을 다른 매대 칸으로 옮긴다. 이미 다른 구역이 있으면 서로 자리를 바꾼다. */
  moveZone: (zoneId: string, row: number, col: number) => void;
  resetCatalog: () => void;
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

/** 상품 이름에서 URL/키로 쓸 수 있는 id를 만든다. 한글은 그대로 두고 공백만 정리한다. */
function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '') || 'product'
  );
}

function uniqueId(base: string, taken: Product[]): string {
  if (!taken.some((p) => p.id === base)) return base;
  let n = 2;
  while (taken.some((p) => p.id === `${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [zones, setZones] = useState<StoreZone[]>(DEFAULT_ZONES);
  const [isRestoring, setIsRestoring] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // 마운트 시 저장된 카탈로그 복원 (없으면 시드 그대로 사용).
  useEffect(() => {
    loadCatalog()
      .then((stored) => {
        if (stored) {
          setProducts(stored.products);
          setZones(stored.zones);
        }
      })
      .finally(() => {
        setHydrated(true);
        setIsRestoring(false);
      });
  }, []);

  // 변경 시 영속화(복원 완료 이후에만 — 시드가 저장본을 덮어쓰지 않도록).
  // 구역 이름 입력처럼 한 글자마다 바뀌는 편집이 있어서 짧게 디바운스한다.
  useEffect(() => {
    if (!hydrated) return undefined;
    const timer = setTimeout(() => saveCatalog({ products, zones }), 400);
    return () => clearTimeout(timer);
  }, [hydrated, products, zones]);

  const findProduct = useCallback(
    (productId: string) => products.find((p) => p.id === productId),
    [products],
  );

  const findZone = useCallback((zoneId: string) => findZoneIn(zones, zoneId), [zones]);

  const productsInZone = useCallback(
    (zoneId: string) => products.filter((p) => p.zone === zoneId),
    [products],
  );

  const addProduct = useCallback(
    (draft: ProductDraft): Product => {
      const created: Product = { ...draft, id: uniqueId(slugify(draft.name), products) };
      setProducts((prev) => [...prev, created]);
      return created;
    },
    [products],
  );

  const updateProduct = useCallback((productId: string, patch: Partial<ProductDraft>) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...patch } : p)));
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const updateZone = useCallback((zoneId: string, patch: Partial<Omit<StoreZone, 'id'>>) => {
    setZones((prev) => prev.map((z) => (z.id === zoneId ? { ...z, ...patch } : z)));
  }, []);

  const moveZone = useCallback((zoneId: string, row: number, col: number) => {
    if (row < 0 || row >= SHELF_ROWS) return;
    setZones((prev) => {
      const moving = prev.find((z) => z.id === zoneId);
      if (!moving || moving.row >= SHELF_ROWS) return prev;
      const occupant = prev.find((z) => z.id !== zoneId && z.row === row && z.col === col);
      return prev.map((z) => {
        if (z.id === zoneId) return { ...z, row, col };
        // 이미 그 칸을 쓰던 구역은 원래 자리로 스왑한다(빈칸이면 그대로).
        if (occupant && z.id === occupant.id) return { ...z, row: moving.row, col: moving.col };
        return z;
      });
    });
  }, []);

  const resetCatalog = useCallback(() => {
    setProducts(DEFAULT_PRODUCTS);
    setZones(DEFAULT_ZONES);
    clearCatalog().catch(() => {
      // 삭제 실패해도 다음 저장에서 시드가 다시 기록된다.
    });
  }, []);

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      zones,
      shelfZones: zones.filter((z) => z.row < SHELF_ROWS),
      isRestoring,
      findProduct,
      findZone,
      productsInZone,
      addProduct,
      updateProduct,
      removeProduct,
      updateZone,
      moveZone,
      resetCatalog,
    }),
    [
      products,
      zones,
      isRestoring,
      findProduct,
      findZone,
      productsInZone,
      addProduct,
      updateProduct,
      removeProduct,
      updateZone,
      moveZone,
      resetCatalog,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog는 CatalogProvider 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}

/** 할인율이 적용된 실제 판매가. 화면마다 같은 계산을 반복하지 않도록 여기서 제공한다. */
export function salePrice(product: Product): number {
  if (!product.discountPercent) return product.unitPrice;
  return Math.round((product.unitPrice * (100 - product.discountPercent)) / 100 / 10) * 10;
}
