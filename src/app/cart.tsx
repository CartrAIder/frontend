import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ModeContext';

/** (2) 장바구니 화면 — Sprint 0 스텁. Sprint 3에서 SSE 실시간 갱신을 구현한다. */
export default function CartScreen() {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.text }]}>
        내 장바구니
      </Text>
      <Text style={[styles.desc, { fontSize: theme.fontBody, color: colors.textMuted }]}>
        SSE 실시간 장바구니 (Sprint 3에서 구현)
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontWeight: '700' },
  desc: {},
});
