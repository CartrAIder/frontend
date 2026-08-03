/**
 * secure-store 기반 매장 카탈로그 로컬 레이어 저장소.
 *
 * 하이브리드: 상품 자체는 백엔드(GET /api/products)가 진실원천이고, 여기에는
 * 앱 표현 레이어만 보관한다 — 관리자 편집/로컬추가/삭제 오버레이(barcode 기준),
 * 매장 구역(zones, 앱 로컬), 그리고 오프라인 즉시표시용 마지막 상품 캐시(cachedProducts).
 *
 * secure-store는 값 하나가 2048바이트를 넘으면 경고와 함께 저장에 실패할 수 있어
 * (Android), JSON을 청크로 쪼개 여러 키에 나눠 저장한다. 청크 개수는 인덱스 키에
 * 기록해 두고 읽을 때 이어 붙인다.
 */
import * as SecureStore from 'expo-secure-store';

import type { ApiProduct } from './api';
import type { OverlayMap } from './catalog/overlay';
import type { StoreZone } from './mock/storeMap';

const INDEX_KEY = 'cartraider.catalog.index';
const CHUNK_KEY = (i: number) => `cartraider.catalog.${i}`;
/** secure-store 권장 한도(2048B)보다 넉넉히 작게 — 한글은 UTF-8에서 3바이트다. */
const CHUNK_SIZE = 600;
/** 오래된 청크를 지울 때 훑어볼 최대 개수 (안전 상한). */
const MAX_CHUNKS = 64;

/** 저장 스키마가 바뀌면 올린다. 저장본 버전이 낮으면 버린다. (v1=구 mock 전체상품 저장) */
export const CATALOG_VERSION = 2;

export interface StoredCatalog {
  version: number;
  /** barcode 기준 로컬 오버레이(관리자 편집/추가/삭제). */
  overlay: OverlayMap;
  /** 매장 매대 구역(앱 로컬). */
  zones: StoreZone[];
  /** 마지막으로 받은 백엔드 상품 목록 — 오프라인/기동 직후 즉시 표시용 캐시. */
  cachedProducts: ApiProduct[];
}

interface CatalogIndex {
  version: number;
  chunks: number;
}

export async function loadCatalog(): Promise<StoredCatalog | null> {
  try {
    const rawIndex = await SecureStore.getItemAsync(INDEX_KEY);
    if (!rawIndex) return null;

    const index = JSON.parse(rawIndex) as CatalogIndex;
    if (index.version !== CATALOG_VERSION || !index.chunks) return null;

    const parts: string[] = [];
    for (let i = 0; i < index.chunks; i += 1) {
      const part = await SecureStore.getItemAsync(CHUNK_KEY(i));
      // 청크가 하나라도 비면 저장본이 깨진 것 — 시드로 다시 시작한다.
      if (part === null) return null;
      parts.push(part);
    }

    return JSON.parse(parts.join('')) as StoredCatalog;
  } catch {
    return null;
  }
}

export async function saveCatalog(catalog: Omit<StoredCatalog, 'version'>): Promise<void> {
  try {
    const json = JSON.stringify({ version: CATALOG_VERSION, ...catalog });
    const chunks: string[] = [];
    for (let i = 0; i < json.length; i += CHUNK_SIZE) {
      chunks.push(json.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i += 1) {
      await SecureStore.setItemAsync(CHUNK_KEY(i), chunks[i]);
    }
    // 이전 저장본이 더 길었다면 남는 꼬리 청크를 지운다.
    for (let i = chunks.length; i < MAX_CHUNKS; i += 1) {
      const stale = await SecureStore.getItemAsync(CHUNK_KEY(i));
      if (stale === null) break;
      await SecureStore.deleteItemAsync(CHUNK_KEY(i));
    }

    await SecureStore.setItemAsync(
      INDEX_KEY,
      JSON.stringify({ version: CATALOG_VERSION, chunks: chunks.length } satisfies CatalogIndex),
    );
  } catch {
    // 저장 실패는 무시 — 현재 세션의 카탈로그 상태에는 영향 없음.
  }
}

export async function clearCatalog(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(INDEX_KEY);
    for (let i = 0; i < MAX_CHUNKS; i += 1) {
      const stale = await SecureStore.getItemAsync(CHUNK_KEY(i));
      if (stale === null) break;
      await SecureStore.deleteItemAsync(CHUNK_KEY(i));
    }
  } catch {
    // 삭제 실패는 무시.
  }
}
