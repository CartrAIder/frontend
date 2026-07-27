import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/context/ModeContext';

/**
 * 라벨이 있는 채움형 입력창 — 토큰 기반. 포커스 시 파랑 테두리로 강조한다.
 * - error: 빨간 테두리 + 하단 메시지 (포커스보다 우선)
 * - invalid: 빨간 테두리만 (메시지 없이 강조만, 예: 로그인 자격 오류로 두 칸 다 표시)
 * - secureTextEntry: 비밀번호 표시/숨김(👁) 토글 버튼을 자동으로 붙인다.
 */
export function TextField({
  label,
  error,
  invalid,
  style,
  ...inputProps
}: { label?: string; error?: string | null; invalid?: boolean } & TextInputProps) {
  const theme = useTheme();
  const { colors } = theme;
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const isPassword = !!inputProps.secureTextEntry;
  const hasError = Boolean(error) || Boolean(invalid);
  const borderColor = hasError ? colors.danger : focused ? colors.primary : colors.surface;

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }}>{label}</Text>
      ) : null}
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          {...inputProps}
          secureTextEntry={isPassword ? hidden : inputProps.secureTextEntry}
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
              paddingRight: isPassword ? 48 : 16,
            },
            style,
          ]}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            style={styles.eye}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? '비밀번호 표시' : '비밀번호 숨김'}
          >
            <Text style={{ fontSize: theme.fontBody + 2 }}>{hidden ? '👁️' : '🙈'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={{ fontSize: theme.fontBody - 3, color: colors.danger }}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: { justifyContent: 'center' },
  input: { borderWidth: 2, paddingHorizontal: 16, paddingVertical: 12 },
  eye: { position: 'absolute', right: 8, height: '100%', justifyContent: 'center', paddingHorizontal: 6 },
});
