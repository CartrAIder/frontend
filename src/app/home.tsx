import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { useAuth } from '@/context/AuthContext';
import { useCartSession } from '@/context/CartSessionContext';
import { useTheme } from '@/context/ModeContext';
import { PRODUCT_CATALOG } from '@/lib/mock/products';

/** 로그인 후 허브 화면 — 여기서 쇼핑 시작·매장 안내·마이페이지 등을 선택해 흐름을 시작한다. */
export default function HomeScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { member } = useAuth();
  const { isConnected, cartId } = useCartSession();

  const discounts = PRODUCT_CATALOG.filter((p) => p.discountPercent);

  const menuTiles = [
    { key: 'navigate', icon: '🧭', label: '매장 길 안내', desc: '상품 위치·경로', onPress: () => router.push('/navigate') },
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

        {/* 메뉴 타일 */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, fontWeight: '700', marginLeft: 4 }}>메뉴</Text>
          <View style={styles.tileRow}>
            {menuTiles.map((t) => (
              <Pressable key={t.key} onPress={t.onPress} style={{ flex: 1 }} accessibilityLabel={t.label}>
                <Card style={styles.tile}>
                  <Text style={styles.tileIcon}>{t.icon}</Text>
                  <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>{t.label}</Text>
                  <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>{t.desc}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 오늘의 할인 */}
        {discounts.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, fontWeight: '700', marginLeft: 4 }}>
              🏷️ 오늘의 할인
            </Text>
            <Card style={{ gap: 10 }}>
              {discounts.map((p) => (
                <View key={p.id} style={styles.discountRow}>
                  <Text style={{ fontSize: 22 }}>{p.icon}</Text>
                  <Text style={{ flex: 1, fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={[styles.discountTag, { backgroundColor: colors.warningSurface, borderRadius: 6 }]}>
                    <Text style={{ fontSize: theme.fontBody - 4, color: colors.warningText, fontWeight: '800' }}>
                      {p.discountPercent}% 할인
                    </Text>
                  </View>
                </View>
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
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  livePill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 2 },
  heroIconWrap: { alignItems: 'center', gap: 2 },
  heroIcon: { fontSize: 40 },
  tileRow: { flexDirection: 'row', gap: 12 },
  tile: { alignItems: 'flex-start', gap: 4, minHeight: 108, justifyContent: 'center' },
  tileIcon: { fontSize: 30, marginBottom: 2 },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  discountTag: { paddingHorizontal: 8, paddingVertical: 4 },
});
