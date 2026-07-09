import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/context/ModeContext';

/**
 * 흰 카드 컨테이너 — 토큰 기반 배경·radius·테두리·그림자.
 * normal은 은은한 그림자로, senior는 강한 테두리로 카드를 구분한다.
 */
export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 기본 내부 여백 적용 여부 (리스트 아이템 등 커스텀 패딩이 필요하면 false). */
  padded?: boolean;
}) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View
      style={[
        styles.card,
        theme.shadowCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          borderRadius: theme.radius,
          padding: padded ? theme.spacing + 4 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
});
