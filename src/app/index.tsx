import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ModeContext';
import { colors } from '@/theme/tokens';

/**
 * (1) 카트 연결 화면 — Sprint 0 스텁.
 * Sprint 1에서 모드 토글, Sprint 2에서 QR 스캔·연동을 구현한다.
 *
 * 아래 "개발용 화면 이동"은 라우팅 확인용 임시 패널이며 Sprint 2에서 제거한다.
 */
export default function CartConnectScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.body}>
        <Text style={[styles.title, { fontSize: theme.fontTitle }]}>카트 연결하기</Text>
        <Text style={[styles.desc, { fontSize: theme.fontBody }]}>
          카트에 붙어있는 QR코드를 스캔해주세요{'\n'}(Sprint 2에서 구현)
        </Text>
      </View>

      {/* TODO(sprint2): 라우팅 확인용 임시 개발 내비게이션 — 실제 구현 시 제거 */}
      <View style={styles.devNav}>
        <Text style={styles.devLabel}>개발용 화면 이동</Text>
        <Link href="/cart" style={styles.devLink}>
          → 장바구니
        </Link>
        <Link href="/checkout" style={styles.devLink}>
          → 결제 확인
        </Link>
        <Link href="/complete" style={styles.devLink}>
          → 결제 완료
        </Link>
        <Link href="/navigate" style={styles.devLink}>
          → 매장 길 안내
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  title: { fontWeight: '700', color: colors.text },
  desc: { color: colors.textMuted, textAlign: 'center', lineHeight: 26 },
  devNav: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    gap: 8,
  },
  devLabel: { color: colors.textMuted, fontSize: 12 },
  devLink: { color: colors.primary, fontSize: 16, paddingVertical: 6 },
});
