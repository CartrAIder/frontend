import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ModeToggle } from '@/components/ModeToggle';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ModeContext';

/** 마이페이지 — 내 정보, 접근성 설정, 앱 정보, 로그아웃. 홈에서 진입한다. */
export default function MyPageScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { member, logout } = useAuth();

  function handleLogout() {
    // 로그아웃 시 카트 세션·장바구니 정리는 캐스케이드가 처리하고, 화면만 로그인으로 되돌린다.
    logout();
    router.replace('/login');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: theme.spacing }}>
        {/* 프로필 */}
        <Card style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={{ fontSize: theme.fontTitle, color: colors.primaryText, fontWeight: '800' }}>
              {member?.name?.trim()?.[0] ?? '👤'}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: theme.fontButton, color: colors.text, fontWeight: '800' }}>
              {member?.name ?? '고객'}님
            </Text>
            <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>{member?.email ?? ''}</Text>
            <View style={[styles.badge, { backgroundColor: colors.primarySurface, borderRadius: 6 }]}>
              <Text style={{ fontSize: theme.fontBody - 5, color: colors.primary, fontWeight: '700' }}>일반 회원</Text>
            </View>
          </View>
        </Card>

        {/* 포인트 (mock) */}
        <View style={[styles.pointsCard, { backgroundColor: colors.primary, borderRadius: theme.radius }]}>
          <Text style={{ fontSize: theme.fontBody, color: colors.primaryText, opacity: 0.9 }}>적립 포인트</Text>
          <Text style={{ fontSize: theme.fontDisplay, color: colors.primaryText, fontWeight: '800' }}>1,240 P</Text>
        </View>

        {/* 접근성 설정 */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, fontWeight: '700', marginLeft: 4 }}>접근성</Text>
          <ModeToggle />
        </View>

        {/* 기타 메뉴 */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, fontWeight: '700', marginLeft: 4 }}>메뉴</Text>
          <Card padded={false}>
            <Pressable
              onPress={() => router.push('/navigate')}
              style={[styles.menuRow, { minHeight: theme.minTouch, padding: theme.spacing + 2 }]}
            >
              <Text style={{ fontSize: 20 }}>🧭</Text>
              <Text style={{ flex: 1, fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }}>매장 길 안내</Text>
              <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>›</Text>
            </Pressable>
            <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
            <View style={[styles.menuRow, { minHeight: theme.minTouch, padding: theme.spacing + 2 }]}>
              <Text style={{ fontSize: 20 }}>ℹ️</Text>
              <Text style={{ flex: 1, fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }}>앱 정보</Text>
              <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>v1.0.0</Text>
            </View>
          </Card>
        </View>

        {/* 로그아웃 */}
        <Pressable
          onPress={handleLogout}
          style={[styles.logoutButton, { borderColor: colors.border, minHeight: theme.minTouch, borderRadius: theme.radiusSm }]}
        >
          <Text style={{ fontSize: theme.fontButton, color: colors.danger, fontWeight: '700' }}>로그아웃</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  pointsCard: { padding: 18, gap: 2 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowDivider: { height: 1, marginHorizontal: 16 },
  logoutButton: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 4 },
});
