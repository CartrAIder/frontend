import { memo } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { artFor, type ArtSpec } from '@/lib/productArt';
import { photoFor } from '@/lib/productPhotos';

/**
 * 상품 이미지 — 번들된 사진이 있으면 사진을, 없으면 이름 기반 벡터 그림을 그린다.
 *
 * 사진은 `assets/products/<상품키>.jpg` 에 넣고 `npm run photos` 로 매핑을 갱신한다.
 * 둘 다 번들에 들어가므로 네트워크가 없어도 항상 뜬다.
 *
 * 나중에 백엔드가 imageUrl 을 주면 여기에 원격 소스 분기를 한 겹 더 얹으면 되고,
 * 화면 코드는 바꿀 필요가 없다.
 */
function ProductImageBase({
  id,
  name,
  zone,
  size,
  radius = 12,
  dimmed = false,
}: {
  id: string;
  name: string;
  zone?: string;
  size: number;
  radius?: number;
  /** 품절 등으로 흐리게 표시할 때. */
  dimmed?: boolean;
}) {
  const photo = photoFor(id);
  const spec = artFor({ id, name, zone });

  // 사진이 있으면 사진을 쓴다. 비율이 제각각이라 cover 로 정사각에 맞춘다.
  if (photo) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: spec.bg,
          overflow: 'hidden',
          opacity: dimmed ? 0.45 : 1,
        }}
      >
        <Image source={photo} style={{ width: size, height: size }} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: spec.bg,
        overflow: 'hidden',
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* 바닥 그림자 — 오브젝트가 떠 보이지 않게 */}
        <Ellipse cx="50" cy="84" rx="26" ry="5" fill="#000000" opacity={0.07} />
        <Shape spec={spec} />
      </Svg>
    </View>
  );
}

/**
 * 같은 상품이면 그림이 항상 같으므로 props 가 그대로면 다시 그리지 않는다.
 * 상품 그리드는 한 화면에 수십 개가 깔려서 이 memo 가 스크롤·전환 부드러움을 좌우한다.
 */
export const ProductImage = memo(ProductImageBase);

/** 종류별 오브젝트. 모든 도형은 대략 x 25~75, y 18~80 안에 들어오게 그린다. */
function Shape({ spec }: { spec: ArtSpec }) {
  const { kind, main, accent } = spec;

  switch (kind) {
    case 'apple':
      return (
        <G>
          <Path d="M50 30 Q47 22 41 19" stroke={accent} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M52 28 Q60 20 68 24 Q62 32 52 31 Z" fill={accent} />
          <Circle cx="41" cy="53" r="21" fill={main} />
          <Circle cx="59" cy="53" r="21" fill={main} />
          <Ellipse cx="43" cy="46" rx="6" ry="8" fill="#FFFFFF" opacity={0.35} />
        </G>
      );

    case 'banana':
      return (
        <G>
          <Path
            d="M30 32 Q28 62 52 74 Q74 82 78 60 Q70 72 52 65 Q38 57 40 32 Z"
            fill={main}
          />
          <Path d="M30 32 Q34 30 40 32" stroke={accent} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d="M44 42 Q44 62 62 70" stroke="#FFFFFF" strokeWidth={3} fill="none" opacity={0.4} />
        </G>
      );

    case 'tomato':
      return (
        <G>
          <Circle cx="50" cy="56" r="23" fill={main} />
          <Path d="M50 33 L44 24 M50 33 L56 24 M50 33 L50 22" stroke={accent} strokeWidth={3} strokeLinecap="round" />
          <Path d="M38 34 Q50 28 62 34 Q50 40 38 34 Z" fill={accent} />
          <Ellipse cx="42" cy="49" rx="5" ry="7" fill="#FFFFFF" opacity={0.35} />
        </G>
      );

    case 'leaf':
      return (
        <G>
          <Path d="M50 78 Q26 66 28 38 Q48 34 52 54 Z" fill={main} />
          <Path d="M50 78 Q74 64 72 36 Q52 34 48 56 Z" fill={accent} opacity={0.85} />
          <Path d="M50 78 L50 44" stroke="#FFFFFF" strokeWidth={2.5} opacity={0.5} strokeLinecap="round" />
        </G>
      );

    case 'milk':
      return (
        <G>
          <Path d="M34 34 L50 22 L66 34 L66 78 L34 78 Z" fill={main} stroke={accent} strokeWidth={2.5} />
          <Rect x="34" y="52" width="32" height="16" fill={accent} opacity={0.85} />
          <Path d="M34 34 L66 34" stroke={accent} strokeWidth={2.5} />
        </G>
      );

    case 'yogurt':
      return (
        <G>
          <Path d="M34 38 L66 38 L62 78 L38 78 Z" fill={main} stroke={accent} strokeWidth={2.5} />
          <Rect x="31" y="30" width="38" height="9" rx="3" fill={accent} />
          <Ellipse cx="50" cy="56" rx="9" ry="9" fill={accent} opacity={0.25} />
        </G>
      );

    case 'cheese':
      return (
        <G>
          <Path d="M26 66 L74 44 L74 70 L26 78 Z" fill={main} />
          <Path d="M26 66 L74 44 L62 38 L26 58 Z" fill={accent} opacity={0.7} />
          <Circle cx="42" cy="66" r="4" fill="#FFFFFF" opacity={0.55} />
          <Circle cx="58" cy="60" r="3" fill="#FFFFFF" opacity={0.55} />
        </G>
      );

    case 'egg':
      return (
        <G>
          <Ellipse cx="38" cy="58" rx="14" ry="18" fill={main} stroke={accent} strokeWidth={2} />
          <Ellipse cx="62" cy="58" rx="14" ry="18" fill={main} stroke={accent} strokeWidth={2} />
          <Ellipse cx="34" cy="50" rx="4" ry="6" fill="#FFFFFF" opacity={0.6} />
        </G>
      );

    case 'bottle':
      return (
        <G>
          <Rect x="44" y="20" width="12" height="12" rx="2" fill={accent} />
          <Path d="M42 32 L58 32 L62 44 L62 78 L38 78 L38 44 Z" fill={main} stroke={accent} strokeWidth={2} />
          <Rect x="38" y="54" width="24" height="12" fill={accent} opacity={0.75} />
        </G>
      );

    case 'can':
      return (
        <G>
          <Rect x="36" y="26" width="28" height="52" rx="6" fill={main} />
          <Ellipse cx="50" cy="26" rx="14" ry="4.5" fill={accent} />
          <Rect x="36" y="46" width="28" height="14" fill="#FFFFFF" opacity={0.85} />
          <Ellipse cx="50" cy="78" rx="14" ry="4" fill={accent} opacity={0.5} />
        </G>
      );

    case 'ramen':
      return (
        <G>
          <Rect x="28" y="30" width="44" height="48" rx="5" fill={main} />
          <Path d="M28 44 L72 44" stroke="#FFFFFF" strokeWidth={3} opacity={0.6} />
          <Ellipse cx="50" cy="60" rx="13" ry="9" fill="#FFFFFF" opacity={0.9} />
          <Path d="M42 60 Q50 55 58 60 M42 64 Q50 59 58 64" stroke={accent} strokeWidth={2} fill="none" />
        </G>
      );

    case 'cupNoodle':
      return (
        <G>
          <Path d="M34 34 L66 34 L62 78 L38 78 Z" fill={main} />
          <Rect x="30" y="26" width="40" height="9" rx="3" fill={accent} />
          <Path d="M36 52 L64 52" stroke="#FFFFFF" strokeWidth={3} opacity={0.7} />
        </G>
      );

    case 'riceBowl':
      return (
        <G>
          <Path d="M30 52 Q50 44 70 52 L64 76 Q50 80 36 76 Z" fill={main} stroke={accent} strokeWidth={2} />
          <Ellipse cx="50" cy="52" rx="20" ry="7" fill="#FFFFFF" />
          <Path d="M30 52 Q50 46 70 52" stroke={accent} strokeWidth={2} fill="none" />
        </G>
      );

    case 'tin':
      return (
        <G>
          <Rect x="32" y="40" width="36" height="34" rx="4" fill={main} />
          <Ellipse cx="50" cy="40" rx="18" ry="6" fill={accent} />
          <Rect x="32" y="52" width="36" height="12" fill="#FFFFFF" opacity={0.75} />
        </G>
      );

    case 'meat':
      return (
        <G>
          <Path d="M28 46 Q40 32 58 36 Q76 40 72 58 Q68 76 48 74 Q30 72 28 46 Z" fill={main} />
          <Path d="M38 50 Q48 44 58 48 Q66 52 62 62" stroke="#FFFFFF" strokeWidth={3.5} fill="none" opacity={0.65} />
          <Path d="M34 62 Q44 58 52 64" stroke={accent} strokeWidth={3} fill="none" opacity={0.6} />
        </G>
      );

    case 'bread':
      return (
        <G>
          <Path d="M28 50 Q28 32 50 32 Q72 32 72 50 L72 74 L28 74 Z" fill={main} />
          <Path d="M28 56 L72 56" stroke={accent} strokeWidth={2.5} opacity={0.6} />
          <Ellipse cx="42" cy="44" rx="5" ry="4" fill="#FFFFFF" opacity={0.4} />
        </G>
      );

    case 'snack':
      return (
        <G>
          <Path d="M32 28 L68 28 L72 74 L28 74 Z" fill={main} />
          <Path d="M32 28 L38 22 L62 22 L68 28 Z" fill={accent} />
          <Circle cx="50" cy="52" r="11" fill="#FFFFFF" opacity={0.85} />
          <Circle cx="46" cy="49" r="2" fill={accent} />
          <Circle cx="54" cy="55" r="2" fill={accent} />
        </G>
      );

    case 'iceCream':
      return (
        <G>
          <Path d="M38 54 L62 54 L50 80 Z" fill={spec.accent} opacity={0.8} />
          <Circle cx="50" cy="42" r="16" fill={main} />
          <Circle cx="42" cy="46" r="10" fill={main} opacity={0.9} />
          <Circle cx="58" cy="46" r="10" fill={main} opacity={0.9} />
          <Circle cx="45" cy="37" r="4" fill="#FFFFFF" opacity={0.5} />
        </G>
      );

    case 'frozen':
      return (
        <G>
          <Rect x="28" y="36" width="44" height="40" rx="5" fill={main} />
          <Path
            d="M50 44 L50 68 M40 50 L60 62 M60 50 L40 62"
            stroke="#FFFFFF"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Rect x="28" y="36" width="44" height="8" rx="4" fill={accent} />
        </G>
      );

    case 'detergent':
      return (
        <G>
          <Rect x="43" y="20" width="14" height="10" rx="2" fill={accent} />
          <Path d="M36 30 L64 30 L68 46 L68 78 L32 78 L32 46 Z" fill={main} />
          <Rect x="38" y="50" width="24" height="18" rx="3" fill="#FFFFFF" opacity={0.85} />
        </G>
      );

    case 'tissue':
      return (
        <G>
          <Rect x="32" y="34" width="36" height="44" rx="6" fill={main} stroke={accent} strokeWidth={2} />
          <Circle cx="50" cy="56" r="8" fill={accent} opacity={0.35} />
          <Path d="M32 42 L68 42" stroke={accent} strokeWidth={2} opacity={0.5} />
        </G>
      );

    case 'paw':
      return (
        <G>
          <Ellipse cx="50" cy="62" rx="16" ry="13" fill={main} />
          <Circle cx="35" cy="44" r="7" fill={main} />
          <Circle cx="45" cy="37" r="7" fill={main} />
          <Circle cx="56" cy="37" r="7" fill={main} />
          <Circle cx="66" cy="44" r="7" fill={main} />
        </G>
      );

    default:
      return (
        <G>
          <Path d="M28 40 L50 30 L72 40 L72 72 L50 82 L28 72 Z" fill={main} />
          <Path d="M28 40 L50 50 L72 40" stroke={accent} strokeWidth={2.5} fill="none" />
          <Path d="M50 50 L50 82" stroke={accent} strokeWidth={2.5} />
        </G>
      );
  }
}
