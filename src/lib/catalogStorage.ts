/**
 * 매장 카탈로그 로컬 레이어 저장소 (async-storage).
 *
 * 하이브리드: 상품 자체는 백엔드(GET /api/products)가 진실원천이고, 여기에는
 * 앱 표현 레이어만 보관한다 — 관리자 편집/로컬추가/삭제 오버레이(barcode 기준),
 * 매장 구역(zones, 앱 로컬), 그리고 오프라인 즉시표시용 마지막 상품 캐시(cachedProducts).
 *
 * secure-store를 쓰지 않는 이유: 여기 담기는 건 상품명·가격·매대 배치라 민감정보가 아닌데,
 * secure-store는 값 하나가 2048바이트를 넘으면 저장이 깨져 JSON을 600B 청크로 쪼개
 * 십수 개 키에 나눠 넣어야 했다. 키 하나하나가 안드로이드 Keystore 암복호화라
 * 저장·복원마다 비용이 컸다. async-storage는 크기 제한이 사실상 없어 한 키에 통째로 넣는다.
 * (로그인 토큰은 민감정보라 그대로 secure-store에 남는다 — lib/authStorage.ts)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { ApiProduct } from './api';
import type { OverlayMap } from './catalog/overlay';
import type { StoreZone } from './mock/storeMap';

const STORAGE_KEY = 'cartraider.catalog';

// ── 구 secure-store 청크 저장본(마이그레이션용) ────────────────────────
const LEGACY_INDEX_KEY = 'cartraider.catalog.index';
const LEGACY_CHUNK_KEY = (i: number) => `cartraider.catalog.${i}`;
const LEGACY_MAX_CHUNKS = 64;

/** 저장 스키마가 바뀌면 올린다. 저장본 버전이 낮으면 버린다. (v1=구 mock 전체상품 저장) */
// 3: 매대 구역 id 개편(fresh/dairy/… → food/beverage/household/digital/beauty/leisure).
//    옛 저장본을 그대로 복원하면 사라진 구역 id가 남아 지도·필터가 어긋난다.
export const CATALOG_VERSION = 3;

export interface StoredCatalog {
  version: number;
  /** barcode 기준 로컬 오버레이(관리자 편집/추가/삭제). */
  overlay: OverlayMap;
  /** 매장 매대 구역(앱 로컬). */
  zones: StoreZone[];
  /** 마지막으로 받은 백엔드 상품 목록 — 오프라인/기동 직후 즉시 표시용 캐시. */
  cachedProducts: ApiProduct[];
}

interface LegacyCatalogIndex {
  version: number;
  chunks: number;
}

function parseCatalog(raw: string | null): StoredCatalog | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as StoredCatalog;
  return parsed.version === CATALOG_VERSION ? parsed : null;
}

/**
 * 예전 secure-store 청크 저장본을 한 번만 읽어 async-storage로 옮기고 지운다.
 * 오버레이·매대 배치는 관리자가 앱에서 편집한 로컬 전용 데이터라 그냥 버리면 안 된다.
 */
async function migrateLegacyCatalog(): Promise<StoredCatalog | null> {
  try {
    const rawIndex = await SecureStore.getItemAsync(LEGACY_INDEX_KEY);
    if (!rawIndex) return null;

    const index = JSON.parse(rawIndex) as LegacyCatalogIndex;
    let migrated: StoredCatalog | null = null;

    if (index.version === CATALOG_VERSION && index.chunks) {
      const parts: string[] = [];
      for (let i = 0; i < index.chunks; i += 1) {
        const part = await SecureStore.getItemAsync(LEGACY_CHUNK_KEY(i));
        // 청크가 하나라도 비면 저장본이 깨진 것 — 버리고 시드로 시작한다.
        if (part === null) {
          migrated = null;
          break;
        }
        parts.push(part);
      }
      if (parts.length === index.chunks) {
        migrated = parseCatalog(parts.join(''));
      }
    }

    if (migrated) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    await clearLegacyCatalog();
    return migrated;
  } catch {
    return null;
  }
}

async function clearLegacyCatalog(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(LEGACY_INDEX_KEY);
    for (let i = 0; i < LEGACY_MAX_CHUNKS; i += 1) {
      const stale = await SecureStore.getItemAsync(LEGACY_CHUNK_KEY(i));
      if (stale === null) break;
      await SecureStore.deleteItemAsync(LEGACY_CHUNK_KEY(i));
    }
  } catch {
    // 삭제 실패는 무시 — 다음 기동에서 다시 시도한다.
  }
}

export async function loadCatalog(): Promise<StoredCatalog | null> {
  try {
    const stored = parseCatalog(await AsyncStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
    // async-storage에 없으면 구 저장본이 남아 있는지 한 번 확인한다.
    return await migrateLegacyCatalog();
  } catch {
    return null;
  }
}

export async function saveCatalog(catalog: Omit<StoredCatalog, 'version'>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CATALOG_VERSION, ...catalog }));
  } catch {
    // 저장 실패는 무시 — 현재 세션의 카탈로그 상태에는 영향 없음.
  }
}

export async function clearCatalog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await clearLegacyCatalog();
  } catch {
    // 삭제 실패는 무시.
  }
}
