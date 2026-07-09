import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/context/ModeContext';

type Variant = 'primary' | 'success' | 'neutral';

/**
 * 앱 전반의 주요 CTA 버튼 — 토큰 기반 높이·radius·색.
 * variant로 파랑(기본)/초록(결제)/중립(보조)을 고른다. loading 시 스피너.
 */
export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  leadingIcon,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  leadingIcon?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const { colors } = theme;

  const bgByVariant: Record<Variant, string> = {
    primary: colors.primary,
    success: colors.success,
    neutral: colors.surface,
  };
  const fgByVariant: Record<Variant, string> = {
    primary: colors.primaryText,
    success: colors.primaryText,
    neutral: colors.text,
  };

  const isDisabled = disabled || loading;
  const backgroundColor = isDisabled && variant !== 'neutral' ? colors.border : bgByVariant[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          minHeight: theme.ctaHeight,
          borderRadius: theme.radius,
          opacity: pressed && !isDisabled ? 0.9 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fgByVariant[variant]} />
      ) : (
        <View style={styles.row}>
          {leadingIcon ? <Text style={{ fontSize: theme.fontButton }}>{leadingIcon}</Text> : null}
          <Text style={{ fontSize: theme.fontButton, color: fgByVariant[variant], fontWeight: '700' }}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
