import { memo } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/context/ModeContext';

/**
 * 선 아이콘 세트 (Feather 스타일).
 *
 * 이모지를 쓰면 기기·OS마다 모양과 크기가 달라져 상업적인 앱처럼 보이지 않는다.
 * 여기 있는 아이콘은 전부 같은 굵기·같은 그리드라 정렬이 맞는다.
 */
export type IconName =
  | 'home'
  | 'grid'
  | 'scan'
  | 'cart'
  | 'user'
  | 'search'
  | 'close'
  | 'chevronRight'
  | 'chevronLeft'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'star'
  | 'tag'
  | 'map'
  | 'receipt'
  | 'lock'
  | 'logout'
  | 'settings'
  | 'check'
  | 'filter'
  | 'bell'
  | 'box';

function IconBase({
  name,
  size = 24,
  color,
  strokeWidth = 2,
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** 탭바 활성 상태처럼 꽉 찬 느낌이 필요할 때. */
  filled?: boolean;
}) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;
  const fill = filled ? stroke : 'none';
  const common = {
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <>
          <Path d="M3 10.5 12 3l9 7.5" {...common} />
          <Path d="M5 10v10h14V10" {...common} fill={filled ? stroke : 'none'} fillOpacity={filled ? 0.15 : 0} />
        </>
      )}
      {name === 'grid' && (
        <>
          <Rect x="3" y="3" width="7.5" height="7.5" rx="2" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
          <Rect x="13.5" y="3" width="7.5" height="7.5" rx="2" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
          <Rect x="3" y="13.5" width="7.5" height="7.5" rx="2" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
          <Rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
        </>
      )}
      {name === 'scan' && (
        <>
          <Path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" {...common} />
          <Path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" {...common} />
          <Path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" {...common} />
          <Path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" {...common} />
          <Path d="M4 12h16" {...common} />
        </>
      )}
      {name === 'cart' && (
        <>
          <Path d="M3 4h2l2.2 10.4a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.2L20 7H6" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
          <Circle cx="9.5" cy="19.5" r="1.4" fill={stroke} />
          <Circle cx="17" cy="19.5" r="1.4" fill={stroke} />
        </>
      )}
      {name === 'user' && (
        <>
          <Circle cx="12" cy="8" r="4" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
          <Path d="M4.5 20a7.5 7.5 0 0 1 15 0" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
        </>
      )}
      {name === 'search' && (
        <>
          <Circle cx="11" cy="11" r="7" {...common} />
          <Path d="m16.5 16.5 4 4" {...common} />
        </>
      )}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...common} />}
      {name === 'chevronRight' && <Path d="m9 5 7 7-7 7" {...common} />}
      {name === 'chevronLeft' && <Path d="m15 5-7 7 7 7" {...common} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...common} />}
      {name === 'minus' && <Path d="M5 12h14" {...common} />}
      {name === 'trash' && (
        <>
          <Path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" {...common} />
        </>
      )}
      {name === 'star' && (
        <Path
          d="m12 3.5 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          fill={filled ? stroke : 'none'}
        />
      )}
      {name === 'tag' && (
        <>
          <Path d="M3 12V4h8l9 9-8 8-9-9z" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
          <Circle cx="7.5" cy="7.5" r="1.4" fill={stroke} />
        </>
      )}
      {name === 'map' && (
        <>
          <Path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
          <Path d="M9 4v13M15 6.5v13" {...common} />
        </>
      )}
      {name === 'receipt' && (
        <>
          <Path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3z" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
          <Path d="M9.5 8h5M9.5 12h5" {...common} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x="5" y="10" width="14" height="10" rx="2.5" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
          <Path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" {...common} />
        </>
      )}
      {name === 'logout' && (
        <>
          <Path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14" {...common} />
          <Path d="m17 8 4 4-4 4M21 12H10" {...common} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx="12" cy="12" r="3" {...common} />
          <Path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" {...common} />
        </>
      )}
      {name === 'check' && <Path d="m5 12.5 4.5 4.5L19 7" {...common} />}
      {name === 'filter' && <Path d="M4 6h16M7 12h10M10 18h4" {...common} />}
      {name === 'bell' && (
        <>
          <Path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
          <Path d="M10 19a2 2 0 0 0 4 0" {...common} />
        </>
      )}
      {name === 'box' && (
        <>
          <Path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
          <Path d="M3 8.5 12 13l9-4.5M12 13v7" {...common} />
        </>
      )}
    </Svg>
  );
}

/** props 가 같으면 다시 그리지 않는다 — 목록·탭바에서 수십 개가 동시에 뜬다. */
export const Icon = memo(IconBase);
