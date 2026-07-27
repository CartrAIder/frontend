import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/context/ModeContext';

/**
 * 라벨이 있는 채움형 입력창 — 토큰 기반. 포커스 시 파랑 테두리로 강조한다.
 * error가 있으면 빨간 테두리 + 하단에 메시지를 표시한다(포커스보다 우선).
 */
export function TextField({
  label,
  error,
  style,
  ...inputProps
}: { label?: string; error?: string | null } & TextInputProps) {
  const theme = useTheme();
  const { colors } = theme;
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.surface;

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...inputProps}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            fontSize: theme.fontBody,
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor,
            borderRadius: theme.radiusSm,
            minHeight: theme.minTouch,
          },
          style,
        ]}
      />
      {error ? (
        <Text style={{ fontSize: theme.fontBody - 3, color: colors.danger }}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 2, paddingHorizontal: 16, paddingVertical: 12 },
});
