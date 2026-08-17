#!/usr/bin/env node
/**
 * assets/products/ 에 있는 사진을 훑어 src/lib/productPhotos.ts 를 다시 만든다.
 *
 * React Native 의 require() 는 정적 경로만 받는다(번들러가 빌드 시점에 해석). 그래서
 * 파일이 있는 것만 골라 명시적인 매핑 파일을 생성해야 한다. 없는 파일을 require 하면
 * 번들 자체가 깨진다.
 *
 * 사용법:
 *   1. assets/products/ 에 <바코드>.jpg (또는 .png/.webp) 로 사진을 넣는다
 *   2. npm run photos
 *   3. 앱 리로드 — 사진이 있는 상품은 사진이, 없는 상품은 기존 벡터 그림이 나온다
 */
import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PHOTO_DIR = join(ROOT, 'assets/products');
const OUT = join(ROOT, 'src/lib/productPhotos.ts');
const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp']);

if (!existsSync(PHOTO_DIR)) {
  mkdirSync(PHOTO_DIR, { recursive: true });
}

const files = readdirSync(PHOTO_DIR)
  .filter((f) => ALLOWED.has(extname(f).toLowerCase()))
  .sort();

const entries = files.map((f) => {
  // 파일명(확장자 제외)이 상품 키 — 백엔드 상품은 바코드, 로컬 상품은 mock id.
  const key = basename(f, extname(f));
  return `  '${key}': require('../../assets/products/${f}'),`;
});

const body = `/**
 * 상품 사진 매핑 — assets/products/<상품키>.jpg
 *
 * ⚠️ 이 파일은 \`npm run photos\` 가 생성한다. 직접 고치지 말고 사진을 넣거나 뺀 뒤
 * 스크립트를 다시 실행할 것.
 *
 * 키는 상품 id 다(백엔드 상품이면 바코드). 여기 없는 상품은 ProductImage 가
 * 이름 기반 벡터 그림으로 자동 폴백한다.
 *
 * 현재 ${files.length}개 등록됨.
 */
import type { ImageSourcePropType } from 'react-native';

const PHOTOS: Record<string, ImageSourcePropType> = {
${entries.join('\n')}
};

/** 해당 상품의 번들 사진. 없으면 undefined(→ 벡터 그림으로 폴백). */
export function photoFor(productId: string): ImageSourcePropType | undefined {
  return PHOTOS[productId];
}

/** 사진이 등록된 상품 수 — 관리 화면 안내용. */
export const PHOTO_COUNT = ${files.length};
`;

writeFileSync(OUT, body.replace(/^\n/, ''));
console.log(`상품 사진 ${files.length}개 매핑 → src/lib/productPhotos.ts`);
if (files.length === 0) {
  console.log('  (assets/products/ 가 비어 있습니다. <바코드>.jpg 형식으로 넣어주세요)');
}
