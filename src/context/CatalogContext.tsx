/**
 * 매장 카탈로그 전역 상태 — 상품 목록 + 매장 구역.
 *
 * 하이브리드: 상품은 백엔드(GET /api/products)가 진실원천이고, 앱은 여기에 로컬 표현 레이어
 * (아이콘·매대 구역·할인·재고)를 barcode 기준 오버레이로 얹어 병합해 보여준다. 고객 화면
 * (상품 보기·매장 지도·길 안내·오늘의 할인)과 관리자 화면이 같은 병합 결과를 본다.
 *
 * - 로그인되면 백엔드 상품을 새로고침한다(상품 조회는 인증 필요).
 * - 오버레이/구역/마지막 상품 캐시는 secure-store에 영속화되어 오프라인·재시작에도 즉시 표시된다.
 * - 관리자 CRUD는 현재 로컬 오버레이만 갱신한다. (백엔드 쓰기 연동은 #13에서)
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

import { useAuth } from '@/context/AuthContext';
import {
  adminCreateProduct,
  adminUpdateProduct,
  fetchProducts,
  type ApiProduct,
  type ApiProductStatus,
} from '@/lib/api';
import { categoryForZone, mergeCatalog, type OverlayMap, type ProductOverlay } from '@/lib/catalog/overlay';
import { clearCatalog, loadCatalog, saveCatalog } from '@/lib/catalogStorage';
import { type Product } from '@/lib/mock/products';
import { DEFAULT_ZONES, SHELF_ROWS, findZoneIn, type StoreZone } from '@/lib/mock/storeMap';

/** 상품 등록/수정 폼이 넘기는 값 — id는 내부에서 부여한다. */
export type ProductDraft = Omit<Product, 'id' | 'backendId' | 'category' | 'status'>;

interface CatalogContextValue {
  products: Product[];
  zones: StoreZone[];
  /** 매대로 배치된 구역(row 0~1)만 — 카테고리 칩·지도 선반에 쓴다. */
  shelfZones: StoreZone[];
  isRestoring: boolean;
  findProduct: (productId: string) => Product | undefined;
  findZone: (zoneId: string) => StoreZone | undefined;
  productsInZone: (zoneId: string) => Product[];
  /** 상품 등록 — 백엔드에 생성(바코드 필요) + 로컬 표현(아이콘·구역·재고·할인) 저장. */
  createProduct: (draft: ProductDraft, barcode: string) => Promise<Product>;
  /** 상품 수정 — 백엔드에 가격·판매상태 반영 + 로컬 표현 갱신(백엔드는 이름/카테고리 수정 불가). */
  editProduct: (productId: string, draft: ProductDraft) => Promise<void>;
  /** 로컬 표현 필드만 즉시 갱신(재고 ± 등). 백엔드 미반영. */
  updateProduct: (productId: string, patch: Partial<ProductDraft>) => void;
  /** 삭제 — 백엔드 삭제 API가 없어 로컬 숨김 + (백엔드 상품이면) 판매상태 SOLD_OUT 처리. */
  removeProduct: (productId: string) => void;
  updateZone: (zoneId: string, patch: Partial<Omit<StoreZone, 'id'>>) => void;
  /** 구역을 다른 매대 칸으로 옮긴다. 이미 다른 구역이 있으면 서로 자리를 바꾼다. */
  moveZone: (zoneId: string, row: number, col: number) => void;
  resetCatalog: () => void;
  /** 백엔드 상품 목록 새로고침(당겨서 새로고침 등). */
  refresh: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

/** ProductDraft에서 오버레이가 보관하는 로컬 표현 필드만 추린다. */
function draftToOverlay(patch: Partial<ProductDraft>): ProductOverlay {
  const o: ProductOverlay = {};
  if (patch.name !== undefined) o.name = patch.name;
  if (patch.unitPrice !== undefined) o.unitPrice = patch.unitPrice;
  if (patch.icon !== undefined) o.icon = patch.icon;
  if (patch.zone !== undefined) o.zone = patch.zone;
  if (patch.stock !== undefined) o.stock = patch.stock;
  if (patch.discountPercent !== undefined) o.discountPercent = patch.discountPercent ?? null;
  if (patch.description !== undefined) o.description = patch.description;
  if (patch.brand !== undefined) o.brand = patch.brand;
  return o;
}

/** 로컬 전용 표현 필드(가격·이름 제외 — 백엔드 상품은 그 둘을 서버가 관리). */
function presentationOverlay(draft: ProductDraft): ProductOverlay {
  return {
    icon: draft.icon,
    zone: draft.zone,
    stock: draft.stock,
    discountPercent: draft.discountPercent ?? null,
    description: draft.description,
    brand: draft.brand,
  };
}

/** 재고 0이면 품절, 아니면 판매중 — 백엔드 status와 매핑. */
function statusFromStock(stock: number): ApiProductStatus {
  return stock > 0 ? 'ON_SALE' : 'SOLD_OUT';
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<OverlayMap>({});
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [zones, setZones] = useState<StoreZone[]>(DEFAULT_ZONES);
  const [isRestoring, setIsRestoring] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const { isAuthenticated } = useAuth();

  // 마운트 시 로컬 레이어 복원(오버레이·구역·상품 캐시). 없으면 빈 오버레이 + 기본 구역.
  useEffect(() => {
    loadCatalog()
      .then((stored) => {
        if (stored) {
          setOverlay(stored.overlay ?? {});
          setZones(stored.zones ?? DEFAULT_ZONES);
          setApiProducts(stored.cachedProducts ?? []);
        }
      })
      .finally(() => {
        setHydrated(true);
        setIsRestoring(false);
      });
  }, []);

  // 백엔드 상품 새로고침. 미인증/오프라인이면 조용히 실패하고 캐시를 유지한다.
  const refresh = useCallback(async () => {
    try {
      const list = await fetchProducts();
      setApiProducts(list);
    } catch {
      // 네트워크/인증 오류 — 마지막 캐시 유지
    }
  }, []);

  // 로그인되면 최신 상품을 받아온다.
  useEffect(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated, refresh]);

  // 백엔드 상품 + 로컬 오버레이 → 화면용 상품 목록.
  const products = useMemo(() => mergeCatalog(apiProducts, overlay), [apiProducts, overlay]);

  // 변경 시 영속화(복원 완료 이후에만). 짧게 디바운스한다(구역 이름 편집 등 잦은 변경 대비).
  useEffect(() => {
    if (!hydrated) return undefined;
    const timer = setTimeout(() => saveCatalog({ overlay, zones, cachedProducts: apiProducts }), 400);
    return () => clearTimeout(timer);
  }, [hydrated, overlay, zones, apiProducts]);

  const findProduct = useCallback(
    (productId: string) => products.find((p) => p.id === productId),
    [products],
  );

  const findZone = useCallback((zoneId: string) => findZoneIn(zones, zoneId), [zones]);

  const productsInZone = useCallback(
    (zoneId: string) => products.filter((p) => p.zone === zoneId),
    [products],
  );

  // 상품 등록 — 백엔드에 생성 후 로컬 표현(아이콘·구역·재고·할인)을 오버레이로 저장한다.
  const createProduct = useCallback(
    async (draft: ProductDraft, barcode: string): Promise<Product> => {
      const bc = barcode.trim();
      const created = await adminCreateProduct({
        barcode: bc,
        name: draft.name,
        price: draft.unitPrice,
        category: categoryForZone(draft.zone),
        status: statusFromStock(draft.stock),
      });
      setOverlay((prev) => ({ ...prev, [created.barcode]: presentationOverlay(draft) }));
      await refresh();
      return {
        ...draft,
        id: created.barcode,
        backendId: created.id,
        category: created.category,
        status: created.status,
      };
    },
    [refresh],
  );

  // 상품 수정 — 백엔드에 가격·판매상태를 반영하고 로컬 표현을 갱신한다.
  // 백엔드는 이름/카테고리 수정 API가 없어, 이름 변경은 로컬 override로만 표시된다.
  const editProduct = useCallback(
    async (productId: string, draft: ProductDraft): Promise<void> => {
      const target = products.find((p) => p.id === productId);
      const isBackend = target?.backendId != null;
      setOverlay((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          ...presentationOverlay(draft),
          name: draft.name,
          // 백엔드 상품은 가격을 서버가 관리(아래 PATCH) → 로컬 override 안 둠. 로컬 전용 상품만 override.
          ...(isBackend ? {} : { unitPrice: draft.unitPrice }),
        },
      }));
      if (isBackend && target?.backendId != null) {
        await adminUpdateProduct(target.backendId, {
          price: draft.unitPrice,
          status: statusFromStock(draft.stock),
        });
        await refresh();
      }
    },
    [products, refresh],
  );

  const updateProduct = useCallback((productId: string, patch: Partial<ProductDraft>) => {
    setOverlay((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], ...draftToOverlay(patch) },
    }));
  }, []);

  const removeProduct = useCallback(
    (productId: string) => {
      // 백엔드 삭제 API가 없어 로컬에서 숨김. 백엔드 상품이면 판매상태를 SOLD_OUT으로 바꿔 주문을 막는다.
      const target = products.find((p) => p.id === productId);
      setOverlay((prev) => ({ ...prev, [productId]: { ...prev[productId], hidden: true } }));
      if (target?.backendId != null) {
        adminUpdateProduct(target.backendId, { status: 'SOLD_OUT' }).catch(() => {});
      }
    },
    [products],
  );

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
    setOverlay({});
    setZones(DEFAULT_ZONES);
    clearCatalog().catch(() => {
      // 삭제 실패해도 다음 저장에서 덮어써진다.
    });
    refresh();
  }, [refresh]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      zones,
      shelfZones: zones.filter((z) => z.row < SHELF_ROWS),
      isRestoring,
      findProduct,
      findZone,
      productsInZone,
      createProduct,
      editProduct,
      updateProduct,
      removeProduct,
      updateZone,
      moveZone,
      resetCatalog,
      refresh,
    }),
    [
      products,
      zones,
      isRestoring,
      findProduct,
      findZone,
      productsInZone,
      createProduct,
      editProduct,
      updateProduct,
      removeProduct,
      updateZone,
      moveZone,
      resetCatalog,
      refresh,
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
