import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useTheme } from '@/context/ModeContext';

/** 비밀번호 표시/숨김 토글용 eye / eye-off 아이콘 (Feather 스타일, react-native-svg). */
function EyeIcon({ off, color, size = 22 }: { off: boolean; color: string; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {off ? (
        <>
          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <Line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <Circle cx="12" cy="12" r="3" />
        </>
      )}
    </Svg>
  );
}

/**
 * 라벨이 있는 채움형 입력창 — 토큰 기반. 포커스 시 파랑 테두리로 강조한다.
 * - error: 빨간 테두리 + 하단 메시지 (포커스보다 우선)
 * - invalid: 빨간 테두리만 (메시지 없이 강조만, 예: 로그인 자격 오류로 두 칸 다 표시)
 * - secureTextEntry: 비밀번호 표시/숨김(👁) 토글 버튼을 자동으로 붙인다.
 */
export const TextField = forwardRef<TextInput, { label?: string; error?: string | null; invalid?: boolean } & TextInputProps>(
  function TextField({ label, error, invalid, style, ...inputProps }, ref) {
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
          ref={ref}
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
            <EyeIcon off={!hidden} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={{ fontSize: theme.fontBody - 3, color: colors.danger }}>{error}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  inputWrap: { justifyContent: 'center' },
  input: { borderWidth: 2, paddingHorizontal: 16, paddingVertical: 12 },
  eye: { position: 'absolute', right: 8, height: '100%', justifyContent: 'center', paddingHorizontal: 6 },
});
