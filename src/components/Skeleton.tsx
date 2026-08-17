import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue } from 'react-native';

import { useTheme } from '@/context/ModeContext';

/**
 * 스켈레톤 — 데이터를 기다리는 동안 최종 레이아웃과 같은 모양의 회색 블록을 보여준다.
 *
 * 스피너 하나만 돌리면 화면이 텅 빈 채로 있다가 갑자기 채워져 껌뻑이는데, 스켈레톤은
 * 들어올 자리를 미리 잡아줘서 그 점프가 없다.
 *
 * 애니메이션은 RN 내장 Animated 의 opacity 펄스다(네이티브 드라이버, 설정 불필요).
 */

/** 여러 스켈레톤이 같은 박자로 깜빡이도록 하나의 펄스 값을 공유한다. */
function usePulse(): Animated.AnimatedInterpolation<number> {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value]);

  return value.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
}

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
  const opacity = usePulse();

  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius: radius, backgroundColor: colors.border, opacity },
        style,
      ]}
    />
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
  const { colors } = useTheme();
  return (
    <View style={{ gap: theme.spacing }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.card,
            { backgroundColor: colors.card, borderRadius: theme.radius, padding: theme.spacing + 4 },
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

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  card: { gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardFoot: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderTopWidth: 1, paddingTop: 10 },
});
