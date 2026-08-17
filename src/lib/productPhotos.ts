/**
 * 상품 사진 매핑 — assets/products/<상품키>.jpg
 *
 * ⚠️ 이 파일은 `npm run photos` 가 생성한다. 직접 고치지 말고 사진을 넣거나 뺀 뒤
 * 스크립트를 다시 실행할 것.
 *
 * 키는 상품 id 다(백엔드 상품이면 바코드). 여기 없는 상품은 ProductImage 가
 * 이름 기반 벡터 그림으로 자동 폴백한다.
 *
 * 현재 0개 등록됨.
 */
import type { ImageSourcePropType } from 'react-native';

const PHOTOS: Record<string, ImageSourcePropType> = {

};

/** 해당 상품의 번들 사진. 없으면 undefined(→ 벡터 그림으로 폴백). */
export function photoFor(productId: string): ImageSourcePropType | undefined {
  return PHOTOS[productId];
}

/** 사진이 등록된 상품 수 — 관리 화면 안내용. */
export const PHOTO_COUNT = 0;
