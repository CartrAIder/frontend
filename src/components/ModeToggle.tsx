import { StyleSheet, Switch, Text, View } from 'react-native';

import { useMode } from '@/context/ModeContext';

/**
 * 첫 화면(카트 연결)에만 배치하는 일반인/노약자 모드 토글.
 * 화면 복제 없이 ModeContext의 mode 하나로 전체 앱 스타일이 전환된다.
 */
export function ModeToggle() {
  const { isSenior, toggleMode, theme } = useMode();
  const { colors } = theme;

  return (
    <View
      style={[
        styles.container,
        {
          minHeight: theme.minTouch,
          padding: theme.spacing,
          gap: theme.spacing / 2,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.textGroup}>
        <Text style={[styles.label, { fontSize: theme.fontBody, color: colors.text }]}>
          큰 글자 · 고대비 모드
        </Text>
        <Text style={[styles.desc, { fontSize: theme.fontBody - 3, color: colors.textMuted }]}>
          어르신·장애인을 위한 접근성 옵션이에요
        </Text>
      </View>
      <Switch
        value={isSenior}
        onValueChange={toggleMode}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.background}
        accessibilityLabel="큰 글자, 고대비 모드 전환"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
  },
  textGroup: { flex: 1, gap: 2 },
  label: { fontWeight: '700' },
  desc: {},
});
