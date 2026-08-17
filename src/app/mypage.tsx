import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabTransition } from '@/components/TabTransition';
import { AppBar } from '@/components/AppBar';
import { BottomTabBar, useTabBarPadding } from '@/components/BottomTabBar';
import { Icon, type IconName } from '@/components/Icon';
import { ModeToggle } from '@/components/ModeToggle';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ModeContext';
import { confirmAction } from '@/lib/confirm';

const GUTTER = 20;

/** 마이페이지 — 프로필 · 혜택 요약 · 메뉴 그룹 · 접근성 설정 · 계정 관리. */
export default function MyPageScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { member, isAdmin, logout } = useAuth();
  const bottomPad = useTabBarPadding();

  function handleLogout() {
    confirmAction(
      '로그아웃',
      '정말 로그아웃할까요?',
      () => {
        // 카트 세션·장바구니 정리는 하위 Provider가 캐스케이드로 처리한다.
        logout();
        router.replace('/login');
      },
      { confirmText: '로그아웃', destructive: true },
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <TabTransition>
        <AppBar title="마이페이지" onBack={() => router.replace('/home')} />
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPad, gap: theme.spacing }}
          showsVerticalScrollIndicator={false}
        >
          {/* 프로필 */}
          <View style={[styles.profile, { paddingHorizontal: GUTTER }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={{ fontSize: theme.fontTitle, color: colors.primaryText, fontWeight: '800' }}>
                {member?.name?.trim()?.[0] ?? '﹖'}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.nameRow}>
                <Text style={{ fontSize: theme.fontButton, color: colors.text, fontWeight: '800' }}>
                  {member?.name ?? '고객'}님
                </Text>
                {isAdmin ? (
                  <View style={[styles.adminTag, { backgroundColor: colors.text }]}>
                    <Text style={{ fontSize: theme.fontBody - 6, color: colors.card, fontWeight: '800' }}>ADMIN</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>{member?.email ?? ''}</Text>
            </View>
          </View>

          {/* 혜택 요약 */}
          <View style={{ paddingHorizontal: GUTTER }}>
            <View style={[styles.statStrip, { backgroundColor: colors.card, borderRadius: theme.radius }, theme.shadowCard]}>
              <StatCell label="적립 포인트" value="1,240" unit="P" />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <StatCell label="쿠폰" value="3" unit="장" />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <StatCell label="주문" value="0" unit="건" />
            </View>
          </View>

          {/* 쇼핑 */}
          <MenuGroup title="쇼핑">
            <MenuRow icon="grid" label="상품 둘러보기" onPress={() => router.replace('/products')} />
            <MenuRow icon="map" label="매장 지도" onPress={() => router.push('/map')} />
            <MenuRow icon="scan" label="카트 연결" onPress={() => router.push('/connect')} />
          </MenuGroup>

          {/* 관리자 */}
          {isAdmin ? (
            <MenuGroup title="관리자">
              <MenuRow icon="settings" label="관리자 콘솔" onPress={() => router.push('/admin')} />
              <MenuRow icon="receipt" label="주문 관리" onPress={() => router.push('/admin/orders')} />
              <MenuRow icon="box" label="상품 관리" onPress={() => router.push('/admin/products')} />
            </MenuGroup>
          ) : null}

          {/* 접근성 */}
          <View style={{ paddingHorizontal: GUTTER, gap: 8 }}>
            <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, fontWeight: '700' }}>접근성</Text>
            <ModeToggle />
          </View>

          {/* 계정 */}
          <MenuGroup title="계정">
            <MenuRow icon="lock" label="비밀번호 변경" onPress={() => router.push('/password-change')} />
            <MenuRow icon="logout" label="로그아웃" onPress={handleLogout} />
            <MenuRow icon="trash" label="회원 탈퇴" tone="danger" onPress={() => router.push('/withdraw')} />
          </MenuGroup>

          <Text style={{ fontSize: theme.fontBody - 5, color: colors.textMuted, textAlign: 'center' }}>
            CartrAIder v1.0.0
          </Text>
        </ScrollView>
      </TabTransition>

      <BottomTabBar />
    </SafeAreaView>
  );
}

function StatCell({ label, value, unit }: { label: string; value: string; unit: string }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View style={styles.statCell}>
      <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted, fontWeight: '600' }}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={{ fontSize: theme.fontButton, color: colors.text, fontWeight: '800' }}>{value}</Text>
        <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted, fontWeight: '700' }}>{unit}</Text>
      </View>
    </View>
  );
}

function MenuGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: theme.fontBody - 2,
          color: colors.textMuted,
          fontWeight: '700',
          paddingHorizontal: GUTTER,
        }}
      >
        {title}
      </Text>
      <View style={{ backgroundColor: colors.card }}>{children}</View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  tone = 'default',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
}) {
  const theme = useTheme();
  const { colors } = theme;
  const tint = tone === 'danger' ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.menuRow, { minHeight: theme.minTouch + 6, paddingHorizontal: GUTTER }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={theme.fontBody + 6} color={tone === 'danger' ? colors.danger : colors.textMuted} />
      <Text style={{ flex: 1, fontSize: theme.fontBody, color: tint, fontWeight: '600' }}>{label}</Text>
      <Icon name="chevronRight" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 4, paddingBottom: 4 },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adminTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statStrip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
