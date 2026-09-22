import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * 탭 화면 전환 — 탭 순서에 따라 좌/우에서 밀려 들어온다.
 *
 * 탭 이동은 `router.replace` 라 네이티브 Stack 전환은 항상 같은 방향이다. 그래서 탭
 * 라우트는 Stack 애니메이션을 끄고(`animation: 'none'`), 여기서 직접 밀어 넣는다.
 * 방향은 BottomTabBar 가 이동 직전에 이 모듈에 적어둔다.
 *
 * reanimated로 UI 스레드에서 돌린다. 탭을 옮기는 순간은 새 화면이 데이터를 읽고 목록을
 * 그리느라 JS 스레드가 가장 바쁜 때라, 전환만큼은 그 영향을 받지 않는 편이 낫다.
 */

export type TabDirection = 'left' | 'right' | 'none';

/** 다음 탭 화면이 어느 쪽에서 들어올지. 화면이 읽는 즉시 소비한다. */
let pendingDirection: TabDirection = 'none';

/** BottomTabBar 가 이동 직전에 호출한다. */
export function setTabDirection(direction: TabDirection): void {
  pendingDirection = direction;
}

/** 한 번 읽으면 초기화한다 — 탭이 아닌 경로로 들어왔을 때 옛 방향이 재사용되지 않게. */
function consumeDirection(): TabDirection {
  const d = pendingDirection;
  pendingDirection = 'none';
  return d;
}

/**
 * 탭 화면 본문을 감싼다. 바텀 탭바는 제자리에 있어야 하므로 이 안에 넣지 않는다.
 */
export function TabTransition({ children }: { children: React.ReactNode }) {
  // 마운트 시점에 한 번만 방향을 정한다(리렌더로 다시 미끄러지지 않게).
  const [direction] = useState(consumeDirection);
  // 슬라이드 거리도 실제 창 폭에서 잡는다(모듈 상수면 웹에서 0이 잡혀 전환이 안 보인다).
  const { width } = useWindowDimensions();
  const slideFrom = width > 0 ? width : 375;
  const offset = useSharedValue(
    direction === 'none' ? 0 : direction === 'right' ? slideFrom : -slideFrom,
  );

  useEffect(() => {
    if (direction === 'none') return;
    offset.value = withTiming(0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [direction, offset]);

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return <Animated.View style={[styles.fill, slide]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
