import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ModeContext';
import { colors } from '@/theme/tokens';

/** (2) 장바구니 화면 — Sprint 0 스텁. Sprint 3에서 SSE 실시간 갱신을 구현한다. */
export default function CartScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Text style={[styles.title, { fontSize: theme.fontTitle }]}>내 장바구니</Text>
      <Text style={[styles.desc, { fontSize: theme.fontBody }]}>
        SSE 실시간 장바구니 (Sprint 3에서 구현)
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 12 },
  title: { fontWeight: '700', color: colors.text },
  desc: { color: colors.textMuted },
});
