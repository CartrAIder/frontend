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
  | 'box'
  // 매대 구역 — 지도·구역 칩에서 이모지 대신 쓴다.
  | 'zoneFood'
  | 'zoneBeverage'
  | 'zoneHousehold'
  | 'zoneDigital'
  | 'zoneBeauty'
  | 'zoneLeisure'
  | 'zoneCheckout';

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
          <Path
            d="M5 10v10h14V10"
            {...common}
            fill={filled ? stroke : 'none'}
            fillOpacity={filled ? 0.15 : 0}
          />
        </>
      )}
      {name === 'grid' && (
        <>
          <Rect
            x="3"
            y="3"
            width="7.5"
            height="7.5"
            rx="2"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Rect
            x="13.5"
            y="3"
            width="7.5"
            height="7.5"
            rx="2"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Rect
            x="3"
            y="13.5"
            width="7.5"
            height="7.5"
            rx="2"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Rect
            x="13.5"
            y="13.5"
            width="7.5"
            height="7.5"
            rx="2"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
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
          <Path
            d="M3 4h2l2.2 10.4a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.2L20 7H6"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Circle cx="9.5" cy="19.5" r="1.4" fill={stroke} />
          <Circle cx="17" cy="19.5" r="1.4" fill={stroke} />
        </>
      )}
      {name === 'user' && (
        <>
          <Circle cx="12" cy="8" r="4" {...common} fill={fill} fillOpacity={filled ? 0.15 : 0} />
          <Path
            d="M4.5 20a7.5 7.5 0 0 1 15 0"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
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
          <Path
            d="M3 12V4h8l9 9-8 8-9-9z"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Circle cx="7.5" cy="7.5" r="1.4" fill={stroke} />
        </>
      )}
      {name === 'map' && (
        <>
          <Path
            d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Path d="M9 4v13M15 6.5v13" {...common} />
        </>
      )}
      {name === 'receipt' && (
        <>
          <Path
            d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3z"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Path d="M9.5 8h5M9.5 12h5" {...common} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect
            x="5"
            y="10"
            width="14"
            height="10"
            rx="2.5"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
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
          <Path
            d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"
            {...common}
          />
        </>
      )}
      {name === 'check' && <Path d="m5 12.5 4.5 4.5L19 7" {...common} />}
      {name === 'filter' && <Path d="M4 6h16M7 12h10M10 18h4" {...common} />}
      {name === 'bell' && (
        <>
          <Path
            d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Path d="M10 19a2 2 0 0 0 4 0" {...common} />
        </>
      )}
      {name === 'box' && (
        <>
          <Path
            d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Path d="M3 8.5 12 13l9-4.5M12 13v7" {...common} />
        </>
      )}
      {/* 식품 — 김이 나는 밥그릇 */}
      {name === 'zoneFood' && (
        <>
          <Path
            d="M4 11h16a8 8 0 0 1-8 8 8 8 0 0 1-8-8z"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Path d="M7 19h10" {...common} />
          <Path d="M10 4.5c-1 1.2-1 2.3 0 3.5M14 4c-1 1.2-1 2.3 0 3.5" {...common} />
        </>
      )}
      {/* 음료 — 빨대 꽂힌 컵 */}
      {name === 'zoneBeverage' && (
        <>
          <Path
            d="M6.5 8h11l-1.2 11.2a1.6 1.6 0 0 1-1.6 1.4H9.3a1.6 1.6 0 0 1-1.6-1.4z"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Path d="M6 8h12" {...common} />
          <Path d="M13.5 8 15 3.5" {...common} />
        </>
      )}
      {/* 생활용품 — 분무기 */}
      {name === 'zoneHousehold' && (
        <>
          <Rect
            x="8"
            y="9"
            width="8"
            height="11.5"
            rx="2"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Path d="M10 9V6.5a1.5 1.5 0 0 1 1.5-1.5H14" {...common} />
          <Path d="M14 5h3.5M16.5 7.5H19M17 3h2.5" {...common} />
        </>
      )}
      {/* 디지털/가전 — 모니터 */}
      {name === 'zoneDigital' && (
        <>
          <Rect
            x="3"
            y="4.5"
            width="18"
            height="12"
            rx="2"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Path d="M9 20h6M12 16.5V20" {...common} />
        </>
      )}
      {/* 화장품/미용 — 립스틱(비스듬히 깎인 심 + 케이스). 작은 크기에서도 형태가 읽히게 두 덩어리로만 그린다. */}
      {name === 'zoneBeauty' && (
        <>
          <Path
            d="M9.5 10.5V6.2L15 3.5v7z"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Rect
            x="8.6"
            y="10.5"
            width="6.8"
            height="10"
            rx="1.6"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Path d="M8.6 14.5h6.8" {...common} />
        </>
      )}
      {/* 패션/취미 — 백팩 */}
      {name === 'zoneLeisure' && (
        <>
          <Path
            d="M5.5 10a6.5 6.5 0 0 1 13 0v8.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Path d="M9.5 9.5V7a2.5 2.5 0 0 1 5 0v2.5" {...common} />
          <Path d="M9 14.5h6" {...common} />
        </>
      )}
      {/* 계산대 — 영수증이 나오는 카운터 */}
      {name === 'zoneCheckout' && (
        <>
          <Rect
            x="3.5"
            y="12"
            width="17"
            height="8.5"
            rx="2"
            {...common}
            fill={fill}
            fillOpacity={filled ? 0.15 : 0}
          />
          <Path d="M7 12V9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" {...common} />
          <Path d="M10 4.5h4" {...common} />
          <Path d="M7 16.5h4" {...common} />
        </>
      )}
    </Svg>
  );
}

/** props 가 같으면 다시 그리지 않는다 — 목록·탭바에서 수십 개가 동시에 뜬다. */
export const Icon = memo(IconBase);
