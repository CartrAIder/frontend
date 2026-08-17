import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { AppBar } from '@/components/AppBar';
import { Card } from '@/components/Card';
import { useAuth } from '@/context/AuthContext';
import { useCatalog } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';

/**
 * 관리자 대시보드 — 매장 현황 요약 + 관리 기능 진입점.
 * 관리자 계정으로 로그인했을 때만 홈에서 이 화면으로 들어올 수 있다.
 */
export default function AdminHomeScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { member } = useAuth();
  const { products, shelfZones, resetCatalog } = useCatalog();

  const soldOut = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10);
  const discounted = products.filter((p) => p.discountPercent);
  const unassigned = products.filter((p) => !shelfZones.some((z) => z.id === p.zone));

  const stats = [
    { key: 'total', label: '등록 상품', value: `${products.length}`, unit: '개', tone: colors.primary },
    { key: 'zones', label: '매장 구역', value: `${shelfZones.length}`, unit: '곳', tone: colors.primary },
    { key: 'discount', label: '할인 진행', value: `${discounted.length}`, unit: '개', tone: colors.warningText },
    { key: 'soldout', label: '품절', value: `${soldOut.length}`, unit: '개', tone: colors.danger },
  ];

  const menus = [
    {
      key: 'orders',
      icon: 'receipt' as IconName,
      title: '주문 관리',
      desc: '주문 검색 · 상태별 조회 · 상세 확인',
      onPress: () => router.push('/admin/orders'),
    },
    {
      key: 'products',
      icon: 'box' as IconName,
      title: '상품 관리',
      desc: '상품 등록 · 가격/재고 수정 · 삭제',
      onPress: () => router.push('/admin/products'),
    },
    {
      key: 'new',
      icon: 'plus' as IconName,
      title: '새 상품 등록',
      desc: '이름 · 가격 · 구역 · 재고 입력',
      onPress: () => router.push('/admin/product-form'),
    },
    {
      key: 'map',
      icon: 'map' as IconName,
      title: '매장 지도 편집',
      desc: '구역 이름 · 위치 · 색상 변경',
      onPress: () => router.push('/admin/map'),
    },
  ];

  function handleReset() {
    Alert.alert('데모 데이터로 초기화', '등록·수정한 상품과 구역이 모두 사라지고 기본값으로 되돌아갑니다.', [
      { text: '취소', style: 'cancel' },
      { text: '초기화', style: 'destructive', onPress: resetCatalog },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <AppBar title="관리자 콘솔" onBack={() => router.replace('/home')} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: theme.spacing }}>
        {/* 관리자 배너 */}
        <View style={[styles.banner, theme.shadowCard, { backgroundColor: colors.text, borderRadius: theme.radius }]}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontSize: theme.fontBody - 3, color: '#FFFFFF', opacity: 0.7, fontWeight: '700' }}>
              ADMIN CONSOLE
            </Text>
            <Text style={{ fontSize: theme.fontTitle, color: '#FFFFFF', fontWeight: '800' }}>
              {member?.name ?? '관리자'}
            </Text>
            <Text style={{ fontSize: theme.fontBody - 2, color: '#FFFFFF', opacity: 0.75 }}>{member?.email}</Text>
          </View>
          <Icon name="settings" size={34} color="#FFFFFF" strokeWidth={1.8} />
        </View>

        {/* 요약 통계 */}
        <View style={styles.statGrid}>
          {stats.map((s) => (
            <Card key={s.key} style={styles.statCard}>
              <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted, fontWeight: '700' }}>{s.label}</Text>
              <View style={styles.statValueRow}>
                <Text style={{ fontSize: theme.fontDisplay, color: s.tone, fontWeight: '800' }}>{s.value}</Text>
                <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, fontWeight: '700' }}>{s.unit}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* 조치가 필요한 항목 */}
        {(soldOut.length > 0 || lowStock.length > 0 || unassigned.length > 0) && (
          <Card style={{ gap: 8 }}>
            <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }}>확인이 필요해요</Text>
            {soldOut.length > 0 && (
              <AlertLine
                tone={colors.danger}
                text={`품절 ${soldOut.length}건 — ${soldOut.map((p) => p.name).join(', ')}`}
              />
            )}
            {lowStock.length > 0 && (
              <AlertLine
                tone={colors.warningText}
                text={`재고 10개 이하 ${lowStock.length}건 — ${lowStock.map((p) => p.name).join(', ')}`}
              />
            )}
            {unassigned.length > 0 && (
              <AlertLine
                tone={colors.textMuted}
                text={`구역이 지정되지 않은 상품 ${unassigned.length}건 — 지도에 표시되지 않아요`}
              />
            )}
          </Card>
        )}

        {/* 관리 메뉴 */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, fontWeight: '700', marginLeft: 4 }}>
            관리 메뉴
          </Text>
          {menus.map((m) => (
            <Pressable key={m.key} onPress={m.onPress} accessibilityRole="button">
              <Card style={styles.menuRow}>
                <View style={[styles.menuIcon, { backgroundColor: colors.primarySurface, borderRadius: theme.radiusSm }]}>
                  <Icon name={m.icon} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>{m.title}</Text>
                  <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>{m.desc}</Text>
                </View>
                <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>›</Text>
              </Card>
            </Pressable>
          ))}
        </View>

        {/* 데이터 초기화 */}
        <Pressable
          onPress={handleReset}
          style={[styles.resetButton, { borderColor: colors.border, borderRadius: theme.radiusSm, minHeight: theme.minTouch }]}
        >
          <Text style={{ fontSize: theme.fontBody, color: colors.danger, fontWeight: '700' }}>데모 데이터로 초기화</Text>
        </Pressable>

        <Text
          style={{ fontSize: theme.fontBody - 5, color: colors.textMuted, textAlign: 'center', lineHeight: 18 }}
        >
          상품 등록·가격·판매상태는 서버에 저장됩니다.{'\n'}
          재고·구역·아이콘·할인은 이 기기에만 저장됩니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function AlertLine({ tone, text }: { tone: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.alertLine}>
      <View style={[styles.alertDot, { backgroundColor: tone }]} />
      <Text style={{ flex: 1, fontSize: theme.fontBody - 3, color: theme.colors.textMuted }} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flexGrow: 1, flexBasis: '45%', gap: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  alertLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  alertDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  resetButton: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
});
