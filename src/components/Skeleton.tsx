import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/context/ModeContext';

/**
 * 스켈레톤 — 데이터를 기다리는 동안 최종 레이아웃과 같은 모양의 회색 블록을 보여준다.
 *
 * 스피너 하나만 돌리면 화면이 텅 빈 채로 있다가 갑자기 채워져 껌뻑이는데, 스켈레톤은
 * 들어올 자리를 미리 잡아줘서 그 점프가 없다.
 *
 * 연출은 블록 위를 빛이 훑고 지나가는 shimmer다. reanimated로 UI 스레드에서 돌리므로
 * 목록이 한 화면에 여러 개 떠 있어도 JS 스레드(데이터 파싱·렌더)를 붙잡지 않는다.
 * OS의 "동작 줄이기" 설정을 켠 사용자에게는 reanimated가 알아서 애니메이션을 생략한다.
 */

/** 빛이 한 번 훑고 지나가는 데 걸리는 시간(ms). */
const SWEEP_DURATION = 1150;

/** 회색 블록 하나. */
export function Skeleton({
  width,
  height,
  radius = 6,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: object;
}) {
  const { colors } = useTheme();
  // 훑는 거리는 블록 실제 너비에 맞춰야 해서 onLayout으로 재서 넣는다(퍼센트 너비 대응).
  const blockWidth = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: SWEEP_DURATION,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      false,
    );
  }, [progress]);

  // 왼쪽 바깥(-w)에서 오른쪽 바깥(+w)까지 이동시켜 한 번 훑는 모양을 만든다.
  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: -blockWidth.value + progress.value * blockWidth.value * 2 }],
  }));

  return (
    <View
      onLayout={(event) => {
        blockWidth.value = event.nativeEvent.layout.width;
      }}
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: radius,
          backgroundColor: colors.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
        <LinearGradient
          colors={['transparent', colors.shimmer, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** 상품 카드 자리(그리드·가로 레일 공용). */
export function ProductCardSkeleton({ width }: { width: number }) {
  const theme = useTheme();
  return (
    <View style={{ width, gap: 8 }}>
      <Skeleton width={width} height={width} radius={theme.imageRadius} />
      <Skeleton width="55%" height={11} />
      <Skeleton width="90%" height={13} />
      <Skeleton width="45%" height={15} />
    </View>
  );
}

/** 상품 카드 그리드 한 판. */
export function ProductGridSkeleton({ width, count = 6 }: { width: number; count?: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.grid, { gap: theme.spacing }]}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} width={width} />
      ))}
    </View>
  );
}

/** 가로형 목록 한 줄(장바구니·주문 내역). */
export function ListRowSkeleton({ imageSize = 72 }: { imageSize?: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { paddingVertical: 14 }]}>
      <Skeleton width={imageSize} height={imageSize} radius={theme.imageRadius} />
      <View style={{ flex: 1, gap: 7 }}>
        <Skeleton width="45%" height={11} />
        <Skeleton width="85%" height={14} />
        <Skeleton width="35%" height={15} />
      </View>
    </View>
  );
}

/** 카드형 목록(관리자 주문 목록 등). */
export function CardListSkeleton({ count = 4 }: { count?: number }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View style={{ gap: theme.spacing }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: theme.radius,
              padding: theme.spacing + 4,
            },
          ]}
        >
          <View style={styles.cardHead}>
            <View style={{ flex: 1, gap: 7 }}>
              <Skeleton width="70%" height={14} />
              <Skeleton width="45%" height={10} />
            </View>
            <Skeleton width={54} height={20} radius={5} />
          </View>
          <View style={[styles.cardFoot, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="40%" height={11} />
              <Skeleton width="65%" height={10} />
            </View>
            <Skeleton width={80} height={17} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** 상품 상세 자리 — 큰 이미지 + 제목·가격 + 본문 블록. */
export function ProductDetailSkeleton({ imageSize }: { imageSize: number }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing + 4 }}>
      <Skeleton width="100%" height={imageSize} radius={theme.imageRadius} />
      <View style={{ gap: 10 }}>
        <Skeleton width="35%" height={12} />
        <Skeleton width="80%" height={20} />
        <Skeleton width="45%" height={24} />
      </View>
      <Skeleton width="100%" height={1} radius={0} />
      <View style={{ gap: 10 }}>
        <Skeleton width="30%" height={14} />
        <Skeleton width="100%" height={140} radius={theme.radius} />
      </View>
    </View>
  );
}

/** 라벨·값 한 줄이 반복되는 자리(마이페이지·결제 요약). */
export function InfoRowsSkeleton({ count = 4 }: { count?: number }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.infoRow}>
          <Skeleton width="30%" height={13} />
          <Skeleton width="25%" height={13} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  card: { gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
