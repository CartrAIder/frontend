import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ModeContext';

/** (4) 결제 완료 화면 — Sprint 0 스텁. Sprint 4에서 QR 영수증·음성 안내를 구현한다. */
export default function CompleteScreen() {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.text }]}>
        결제 완료
      </Text>
      <Text style={[styles.desc, { fontSize: theme.fontBody, color: colors.textMuted }]}>
        QR 영수증 · 음성 안내 · 세션 종료 (Sprint 4에서 구현)
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontWeight: '700' },
  desc: {},
});
