/**
 * secure-store 기반 카트 세션·장바구니 저장소.
 *
 * 회원 세션(로그인)과 독립적으로, "카트 연결(QR)"과 "담긴 상품"을 영속화한다.
 * 덕분에 쇼핑 중 앱을 나갔다 돌아와도 연결된 카트와 장바구니가 그대로 복원된다.
 *
 * CartItem 타입을 여기 두는 이유: CartContext가 이 모듈을 import하므로,
 * 순환 참조를 피하려면 공용 타입을 저장소 쪽에 두는 편이 깔끔하다.
 *
 * 장바구니는 비밀 정보가 아니지만, 새 의존성(AsyncStorage) 없이 기존 코드와
 * 동일한 저장 방식을 쓰기 위해 SecureStore를 사용한다(페이로드가 작아 무리 없음).
 */
import * as SecureStore from 'expo-secure-store';

const CART_SESSION_KEY = 'cartraider.cartSession';
const CART_KEY = 'cartraider.cart';

export interface CartItem {
  id: string;
  name: string;
  unitPrice: number;
  qty: number;
}

/** 장바구니 스냅샷 — 상품 목록과 mock 스캔 진행 인덱스(복원 시 이어받기용). */
export interface PersistedCart {
  items: CartItem[];
  scanIndex: number;
}

// ── 카트 세션(연결된 카트 ID) ──────────────────────────────────────────

export async function loadCartId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CART_SESSION_KEY);
  } catch {
    return null;
  }
}

export async function saveCartId(cartId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(CART_SESSION_KEY, cartId);
  } catch {
    // 저장 실패는 무시.
  }
}

export async function clearCartId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CART_SESSION_KEY);
  } catch {
    // 삭제 실패는 무시.
  }
}

// ── 장바구니 스냅샷 ────────────────────────────────────────────────────

export async function loadCart(): Promise<PersistedCart | null> {
  try {
    const raw = await SecureStore.getItemAsync(CART_KEY);
    return raw ? (JSON.parse(raw) as PersistedCart) : null;
  } catch {
    return null;
  }
}

export async function saveCart(cart: PersistedCart): Promise<void> {
  try {
    await SecureStore.setItemAsync(CART_KEY, JSON.stringify(cart));
  } catch {
    // 저장 실패는 무시 — 현재 세션의 장바구니 상태에는 영향 없음.
  }
}

export async function clearCart(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CART_KEY);
  } catch {
    // 삭제 실패는 무시.
  }
}
