import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { useAuth } from '@/context/AuthContext';
import { useCartSession } from '@/context/CartSessionContext';
import { salePrice, useCatalog } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';

/** 로그인 후 허브 화면 — 여기서 쇼핑 시작·상품 보기·매장 지도·마이페이지 등을 선택해 흐름을 시작한다. */
export default function HomeScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { member, isAdmin } = useAuth();
  const { isConnected, cartId } = useCartSession();
  const { products } = useCatalog();

  const discounts = products.filter((p) => p.discountPercent).slice(0, 4);

  const menuTiles = [
    { key: 'products', icon: '🔎', label: '상품 보기', desc: '이 매장에서 파는 것', onPress: () => router.push('/products') },
    { key: 'map', icon: '🗺️', label: '매장 지도', desc: '구역·상품 위치', onPress: () => router.push('/map') },
    { key: 'mypage', icon: '👤', label: '마이페이지', desc: '내 정보·설정', onPress: () => router.push('/mypage') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: theme.spacing + 2 }}>
        {/* 헤더 */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>안녕하세요 👋</Text>
            <Text style={{ fontSize: theme.fontTitle, color: colors.text, fontWeight: '800' }}>
              {member ? `${member.name}님` : '고객님'}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/mypage')}
            accessibilityLabel="마이페이지"
            style={[styles.avatar, { backgroundColor: colors.primarySurface }]}
          >
            <Text style={{ fontSize: theme.fontButton, color: colors.primary, fontWeight: '800' }}>
              {member?.name?.trim()?.[0] ?? '👤'}
            </Text>
          </Pressable>
        </View>

        {/* 관리자 전용 진입 버튼 — admin 계정에만 보인다. */}
        {isAdmin && (
          <Pressable onPress={() => router.push('/admin')} accessibilityRole="button" accessibilityLabel="관리자 페이지">
            <View style={[styles.adminBar, theme.shadowCard, { backgroundColor: colors.text, borderRadius: theme.radius }]}>
              <Text style={{ fontSize: 22 }}>🛠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: theme.fontBody, color: '#FFFFFF', fontWeight: '800' }}>관리자 페이지</Text>
                <Text style={{ fontSize: theme.fontBody - 4, color: '#FFFFFF', opacity: 0.7 }}>
                  상품 등록 · 재고 · 매장 지도 편집
                </Text>
              </View>
              <Text style={{ fontSize: theme.fontBody, color: '#FFFFFF', opacity: 0.8 }}>›</Text>
            </View>
          </Pressable>
        )}

        {/* 히어로 CTA — 쇼핑 시작 / 계속하기 */}
        <Pressable onPress={() => router.push(isConnected ? '/cart' : '/connect')} accessibilityRole="button">
          <View
            style={[
              styles.hero,
              theme.shadowCard,
              { backgroundColor: isConnected ? colors.success : colors.primary, borderRadius: theme.radius },
            ]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              {isConnected && (
                <View style={styles.livePill}>
                  <Text style={{ fontSize: theme.fontBody - 5, color: colors.primaryText, fontWeight: '700' }}>
                    ● 쇼핑 진행 중 · 카트 #{cartId}
                  </Text>
                </View>
              )}
              <Text style={{ fontSize: theme.fontTitle, color: colors.primaryText, fontWeight: '800' }}>
                {isConnected ? '쇼핑 계속하기' : '쇼핑 시작하기'}
              </Text>
              <Text style={{ fontSize: theme.fontBody, color: colors.primaryText, opacity: 0.9 }}>
                {isConnected ? '담은 상품을 이어서 결제하세요' : '카트 QR을 스캔하고 담아보세요'}
              </Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Text style={styles.heroIcon}>{isConnected ? '🛍️' : '🛒'}</Text>
              <Text style={{ fontSize: theme.fontBody, color: colors.primaryText, fontWeight: '800' }}>→</Text>
            </View>
          </View>
        </Pressable>

        {/* 메뉴 타일 (2 × 2) */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, fontWeight: '700', marginLeft: 4 }}>메뉴</Text>
          <View style={styles.tileGrid}>
            {menuTiles.map((t) => (
              <Pressable key={t.key} onPress={t.onPress} style={styles.tileWrap} accessibilityLabel={t.label}>
                <Card style={styles.tile}>
                  <Text style={styles.tileIcon}>{t.icon}</Text>
                  <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>{t.label}</Text>
                  <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }} numberOfLines={1}>
                    {t.desc}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 오늘의 할인 */}
        {discounts.length > 0 && (
          <View style={{ gap: 8 }}>
            <Pressable onPress={() => router.push('/products')} style={styles.sectionHead}>
              <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, fontWeight: '700' }}>🏷️ 오늘의 할인</Text>
              <Text style={{ fontSize: theme.fontBody - 3, color: colors.primary, fontWeight: '700' }}>전체 보기 ›</Text>
            </Pressable>
            <Card style={{ gap: 10 }}>
              {discounts.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/product/${p.id}`)}
                  style={[styles.discountRow, { minHeight: theme.minTouch - 8 }]}
                >
                  <Text style={{ fontSize: 22 }}>{p.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>
                      ₩{salePrice(p).toLocaleString('ko-KR')}
                    </Text>
                  </View>
                  <View style={[styles.discountTag, { backgroundColor: colors.warningSurface, borderRadius: 6 }]}>
                    <Text style={{ fontSize: theme.fontBody - 4, color: colors.warningText, fontWeight: '800' }}>
                      {p.discountPercent}% 할인
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  adminBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  livePill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 2 },
  heroIconWrap: { alignItems: 'center', gap: 2 },
  heroIcon: { fontSize: 40 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tileWrap: { flexGrow: 1, flexBasis: '45%' },
  tile: { alignItems: 'flex-start', gap: 4, minHeight: 108, justifyContent: 'center' },
  tileIcon: { fontSize: 30, marginBottom: 2 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 4 },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  discountTag: { paddingHorizontal: 8, paddingVertical: 4 },
});
