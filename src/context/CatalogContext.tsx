/**
 * 매장 카탈로그 전역 상태 — 상품 목록 + 매장 구역.
 *
 * 하이브리드: 상품은 백엔드(GET /api/products)가 진실원천이고, 앱은 여기에 로컬 표현 레이어
 * (아이콘·매대 구역·할인·재고)를 barcode 기준 오버레이로 얹어 병합해 보여준다. 고객 화면
 * (상품 보기·매장 지도·길 안내·오늘의 할인)과 관리자 화면이 같은 병합 결과를 본다.
 *
 * - 로그인되면 백엔드 상품을 새로고침한다(상품 조회는 인증 필요).
 * - 오버레이/구역/마지막 상품 캐시는 secure-store에 영속화되어 오프라인·재시작에도 즉시 표시된다.
 * - 관리자 쓰기: 등록·가격·판매상태는 백엔드에 반영된다. 재고·구역·아이콘·할인은 백엔드
 *   Product 스키마에 없어 로컬 오버레이에만 남고, 재고는 0 여부만 판매상태로 서버에 전달된다.
 *   이름·카테고리는 백엔드에 수정 API가 없어 로컬 표시만 바뀐다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Image as ExpoImage } from 'expo-image';

import { useAuth } from '@/context/AuthContext';
import {
  adminCreateProduct,
  adminUpdateProduct,
  fetchProducts,
  type ApiProduct,
  type ApiProductCategory,
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
  /** 상품 등록. category를 주지 않으면 매대 구역에서 대표 카테고리를 유추한다. */
  createProduct: (draft: ProductDraft, barcode: string, category?: ApiProductCategory) => Promise<Product>;
  /** 상품 수정 — 백엔드에 가격·판매상태 반영 + 로컬 표현 갱신(백엔드는 이름/카테고리 수정 불가). */
  editProduct: (productId: string, draft: ProductDraft) => Promise<void>;
  /**
   * 로컬 표현 필드 갱신(재고 ± 등).
   * 재고 변경으로 판매상태(ON_SALE/SOLD_OUT)가 바뀌면 백엔드에도 반영하며, 이때는
   * 서버 반영이 성공한 뒤에 화면이 바뀐다. 실패 시 throw하므로 호출부가 안내해야 한다.
   */
  updateProduct: (productId: string, patch: Partial<ProductDraft>) => Promise<void>;
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
  /** 서버에서 상품을 받아온 적이 있는지 — 캐시 복원이 최신 결과를 덮어쓰는 것을 막는다. */
  const freshLoaded = useRef(false);

  // 마운트 시 로컬 레이어 복원(오버레이·구역·상품 캐시). 없으면 빈 오버레이 + 기본 구역.
  useEffect(() => {
    loadCatalog()
      .then((stored) => {
        if (stored) {
          setOverlay(stored.overlay ?? {});
          setZones(stored.zones ?? DEFAULT_ZONES);
          // 서버 응답이 먼저 도착했으면(느린 기기·빠른 네트워크) 캐시로 덮어쓰지 않는다.
          if (!freshLoaded.current) setApiProducts(stored.cachedProducts ?? []);
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
      freshLoaded.current = true;
      setApiProducts(list);
      // 목록을 받은 직후 상품 사진을 디스크 캐시에 미리 받아둔다.
      // 홈/카테고리로 들어갈 때 네트워크를 기다리지 않고 바로 뜨게 하려는 것이라
      // 실패는 무시한다(그때 가서 각 이미지가 알아서 다시 받는다).
      const urls = list.map((p) => p.imageUrl).filter((url): url is string => Boolean(url));
      if (urls.length > 0) {
        ExpoImage.prefetch(urls, { cachePolicy: 'memory-disk' }).catch(() => {});
      }
    } catch {
      // 네트워크/인증 오류 — 마지막 캐시 유지
    }
  }, []);

  /**
   * 상품 조회는 로그인이 필요 없다(서버에서 /api/products permitAll).
   * 그래서 앱이 켜지자마자 — 로그인 화면이 떠 있는 동안 — 미리 받아둔다. 효과가 세 가지다.
   *  1. HTTPS 연결이 미리 뚫린다. 첫 요청은 TLS 핸드셰이크 때문에 0.7초쯤 더 드는데,
   *     로그인 버튼을 누르는 시점엔 그 비용을 이미 치른 상태가 된다.
   *  2. 상품 목록이 이미 메모리에 있어서 로그인 직후 홈이 바로 그려진다.
   *  3. 상품 사진 프리페치도 그만큼 일찍 시작된다.
   * 로그인 상태가 바뀔 때도 다시 받아 최신화한다.
   */
  useEffect(() => {
    refresh();
  }, [refresh, isAuthenticated]);

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
    async (draft: ProductDraft, barcode: string, category?: ApiProductCategory): Promise<Product> => {
      const bc = barcode.trim();
      const created = await adminCreateProduct({
        barcode: bc,
        name: draft.name,
        price: draft.unitPrice,
        category: category ?? categoryForZone(draft.zone),
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

  const updateProduct = useCallback(
    async (productId: string, patch: Partial<ProductDraft>) => {
      const target = products.find((p) => p.id === productId);
      const nextStatus = patch.stock === undefined ? null : statusFromStock(patch.stock);
      // 재고가 0을 넘나들 때만 서버를 부른다(5→4처럼 상태가 그대로면 네트워크 요청 없음).
      const backendId = target?.backendId;
      const needsSync = nextStatus !== null && backendId != null && nextStatus !== target?.status;

      // 판매상태가 바뀌는 경우엔 서버 반영 후에 화면을 바꾼다. 실패했는데 로컬만 품절로
      // 보이면 관리자는 주문을 막았다고 착각하지만 서버는 ON_SALE이라 주문이 계속 들어온다.
      if (needsSync && backendId != null && nextStatus != null) {
        await adminUpdateProduct(backendId, { status: nextStatus });
      }

      setOverlay((prev) => ({
        ...prev,
        [productId]: { ...prev[productId], ...draftToOverlay(patch) },
      }));

      if (needsSync) await refresh();
    },
    [products, refresh],
  );

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
