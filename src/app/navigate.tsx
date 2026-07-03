import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ModeContext';
import { colors } from '@/theme/tokens';

/** (5) 매장 길 안내 화면 — Sprint 0 스텁. Sprint 5에서 상품 위치·할인 이벤트를 구현한다. */
export default function NavigateScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Text style={[styles.title, { fontSize: theme.fontTitle }]}>매장 길 안내</Text>
      <Text style={[styles.desc, { fontSize: theme.fontBody }]}>
        상품 위치 · 할인 이벤트 (Sprint 5에서 구현)
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 12 },
  title: { fontWeight: '700', color: colors.text },
  desc: { color: colors.textMuted },
});
