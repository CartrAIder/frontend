import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ModeContext';
import { colors } from '@/theme/tokens';

/** (3) 결제 확인 화면 — Sprint 0 스텁. Sprint 4에서 1탭 결제 확인을 구현한다. */
export default function CheckoutScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Text style={[styles.title, { fontSize: theme.fontTitle }]}>결제 확인</Text>
      <Text style={[styles.desc, { fontSize: theme.fontBody }]}>
        주문 요약 · 1탭 결제 확인 (Sprint 4에서 구현)
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 12 },
  title: { fontWeight: '700', color: colors.text },
  desc: { color: colors.textMuted },
});
