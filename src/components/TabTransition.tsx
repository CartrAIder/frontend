import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet } from 'react-native';

/**
 * 탭 화면 전환 — 탭 순서에 따라 좌/우에서 밀려 들어온다.
 *
 * 탭 이동은 `router.replace` 라 네이티브 Stack 전환은 항상 같은 방향이다. 그래서 탭
 * 라우트는 Stack 애니메이션을 끄고(`animation: 'none'`), 여기서 직접 밀어 넣는다.
 * 방향은 BottomTabBar 가 이동 직전에 이 모듈에 적어둔다.
 *
 * reanimated 대신 RN 내장 Animated 를 쓴다(babel 플러그인 설정이 필요 없고 네이티브
 * 드라이버로 도는 transform 이라 성능도 충분하다).
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

const SCREEN_W = Dimensions.get('window').width;

/**
 * 탭 화면 본문을 감싼다. 바텀 탭바는 제자리에 있어야 하므로 이 안에 넣지 않는다.
 */
export function TabTransition({ children }: { children: React.ReactNode }) {
  // 마운트 시점에 한 번만 방향을 정한다(리렌더로 다시 미끄러지지 않게).
  const direction = useRef(consumeDirection()).current;
  const translateX = useRef(
    new Animated.Value(direction === 'none' ? 0 : direction === 'right' ? SCREEN_W : -SCREEN_W),
  ).current;

  useEffect(() => {
    if (direction === 'none') return;
    Animated.timing(translateX, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [direction, translateX]);

  return (
    <Animated.View style={[styles.fill, { transform: [{ translateX }] }]}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
