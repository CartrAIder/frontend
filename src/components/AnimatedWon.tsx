import { useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { formatWon } from '@/lib/format';

/**
 * 금액 표시 — 값이 바뀌면 숫자가 굴러 올라간다.
 *
 * 장바구니 합계는 카트가 상품을 인식할 때마다 바뀌는데, 숫자가 툭 바뀌면 방금 뭐가
 * 반영됐는지 눈에 안 들어온다. 짧게 굴려주면 "지금 이게 더해졌다"가 보인다.
 *
 * 구현: reanimated가 UI 스레드에서 값을 보간하고, 애니메이션 가능한 TextInput의
 * `text` prop에 직접 써넣는다. 매 프레임 setState를 하지 않으므로 목록이 함께 갱신되는
 * 순간에도 숫자가 끊기지 않는다. (입력은 막아둔 표시 전용 TextInput이다)
 *
 * `text`는 네이티브 전용 prop이라 웹에서는 동작하지 않는다. 웹은 애니메이션 없이
 * 값만 정확히 보여주는 Text로 갈라둔다(숫자가 멈춰 있는 것보다 낫다).
 */

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/** formatWon과 같은 결과("₩12,900")를 UI 스레드에서 만든다. worklet은 Intl을 못 쓴다. */
function formatWonOnUI(amount: number): string {
  'worklet';
  const digits = String(Math.max(0, Math.round(amount)));
  let grouped = '';
  for (let i = 0; i < digits.length; i += 1) {
    grouped += digits[i];
    const remaining = digits.length - 1 - i;
    if (remaining > 0 && remaining % 3 === 0) grouped += ',';
  }
  return `₩${grouped}`;
}

export function AnimatedWon({
  value,
  style,
  duration = 420,
}: {
  value: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
}) {
  const animated = useSharedValue(value);

  useEffect(() => {
    animated.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [value, duration, animated]);

  // `text`는 TextInput의 네이티브 전용 prop이라 공개 타입(TextInputProps)에 없다.
  // reanimated 공식 예제도 같은 이유로 캐스팅해서 쓴다.
  const animatedProps = useAnimatedProps(
    () => ({ text: formatWonOnUI(animated.value) }) as unknown as TextInputProps,
  );

  if (Platform.OS === 'web') {
    return <Text style={style}>{formatWon(value)}</Text>;
  }

  return (
    <AnimatedTextInput
      editable={false}
      // 굴러가는 중간값이 아니라 최종 금액을 읽어주도록 라벨을 따로 준다.
      accessibilityLabel={formatWon(value)}
      underlineColorAndroid="transparent"
      style={[styles.text, style]}
      // 제어 컴포넌트(value)로 두면 리렌더마다 React가 텍스트를 되돌려 애니메이션과 싸운다.
      // 초기값만 주고 이후에는 animatedProps가 네이티브에서 직접 쓴다.
      defaultValue={formatWon(value)}
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  // TextInput 기본 여백·높이를 없애 Text 처럼 보이게 한다.
  text: { padding: 0, margin: 0, includeFontPadding: false },
});
