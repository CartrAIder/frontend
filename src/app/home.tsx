import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandRefreshLoader } from '@/components/BrandLoader';
import { useBrandRefresh } from '@/components/BrandRefresh';
import { ProductCardSkeleton, ProductGridSkeleton } from '@/components/Skeleton';
import { TabTransition } from '@/components/TabTransition';
import { BottomTabBar, useTabBarPadding } from '@/components/BottomTabBar';
import { Icon } from '@/components/Icon';
import { HorizontalRail, ProductCard, SearchBar, SectionHeader } from '@/components/commerce';
import { useAuth } from '@/context/AuthContext';
import { useCartSession } from '@/context/CartSessionContext';
import { salePrice, useCatalog } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';
import { formatWon } from '@/lib/format';
import { useProductGrid } from '@/lib/layout';

const GUTTER = 20;

/**
 * 홈 — 검색 · 진행 중인 쇼핑 · 카테고리 · 오늘의 할인 · 추천 상품.
 * 국내 쇼핑앱 홈 관례를 따라 위에서 아래로 "찾기 → 지금 할 일 → 둘러보기" 순으로 쌓는다.
 */
export default function HomeScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { member, isAdmin } = useAuth();
  const { isConnected, cartId } = useCartSession();
  const { products, shelfZones, isRestoring, refresh } = useCatalog();
  const { refreshing, refreshControl } = useBrandRefresh(refresh);
  const bottomPad = useTabBarPadding();

  const onSale = useMemo(() => products.filter((p) => p.discountPercent && p.stock > 0), [products]);
  const recommended = useMemo(
    () => products.filter((p) => p.stock > 0 && !p.discountPercent).slice(0, 10),
    [products],
  );

  // 카드 폭은 실제 창 폭에서 매 렌더 계산한다(모듈 상수로 굳히면 웹에서 찌그러진다).
  const { cardWidth: gridCardW, railCardWidth: railCardW } = useProductGrid(
    theme.gridColumns,
    theme.spacing,
    GUTTER,
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <TabTransition>
        {/* 상단 바 */}
        <View style={[styles.topBar, { paddingHorizontal: GUTTER }]}>
          <Text style={{ fontSize: theme.fontTitle, color: colors.primary, fontWeight: '800', letterSpacing: -0.5 }}>
            CartrAIder
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => router.push('/map')} hitSlop={8} accessibilityLabel="매장 지도">
            <Icon name="map" size={theme.fontBody + 8} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => router.replace('/mypage')} hitSlop={8} accessibilityLabel="마이페이지">
            <Icon name="user" size={theme.fontBody + 8} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPad, gap: theme.spacing + 6 }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <View style={{ paddingHorizontal: GUTTER }}>
            <BrandRefreshLoader visible={refreshing} />
          </View>

          {/* 검색 */}
          <View style={{ paddingHorizontal: GUTTER, paddingTop: 4 }}>
            <SearchBar onPress={() => router.replace('/products')} />
          </View>

          {/* 진행 중인 쇼핑 / 시작하기 */}
          <View style={{ paddingHorizontal: GUTTER }}>
            <Pressable onPress={() => router.push(isConnected ? '/cart' : '/connect')} accessibilityRole="button">
              <View
                style={[
                  styles.hero,
                  theme.shadowCard,
                  { backgroundColor: isConnected ? colors.success : colors.primary, borderRadius: theme.radius },
                ]}
              >
                <View style={{ flex: 1, gap: 5 }}>
                  {isConnected ? (
                    <View style={styles.livePill}>
                      <Text style={{ fontSize: theme.fontBody - 5, color: '#FFFFFF', fontWeight: '800' }}>
                        ● 쇼핑 중 · {cartId}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={{ fontSize: theme.fontButton + 2, color: '#FFFFFF', fontWeight: '800' }}>
                    {isConnected ? '쇼핑 계속하기' : '카트 스캔하고 시작하기'}
                  </Text>
                  <Text style={{ fontSize: theme.fontBody - 1, color: '#FFFFFF', opacity: 0.9 }}>
                    {isConnected ? '담은 상품을 확인하고 바로 결제하세요' : '카트에 붙은 QR을 찍으면 바로 담겨요'}
                  </Text>
                </View>
                <View style={styles.heroArrow}>
                  <Icon name="chevronRight" size={20} color="#FFFFFF" strokeWidth={2.6} />
                </View>
              </View>
            </Pressable>
          </View>

          {/* 카테고리 바로가기 */}
          <View style={{ gap: theme.spacing }}>
            <View style={{ paddingHorizontal: GUTTER }}>
              <SectionHeader title="카테고리" onMore={() => router.replace('/products')} />
            </View>
            <HorizontalRail>
              {shelfZones.map((zone) => (
                <Pressable
                  key={zone.id}
                  onPress={() => router.replace(`/products?zone=${zone.id}` as never)}
                  style={styles.categoryItem}
                  accessibilityLabel={`${zone.label} 카테고리`}
                >
                  {/* 매대 아이콘은 storeMap에 정의된 이모지를 쓴다(관리자 지도 편집에서 바꿀 수 있다).
                      상품 벡터 아트로 그리면 식품이 아닌 매대가 전부 같은 상자 그림이 된다. */}
                  <View style={[styles.categoryCircle, { backgroundColor: zone.color }]}>
                    <Text style={{ fontSize: 26 }}>{zone.icon}</Text>
                  </View>
                  <Text
                    style={{ fontSize: theme.fontBody - 3, color: colors.text, fontWeight: '600' }}
                    numberOfLines={1}
                  >
                    {zone.label}
                  </Text>
                </Pressable>
              ))}
            </HorizontalRail>
          </View>

          {/* 오늘의 할인 */}
          {isRestoring ? (
            <View style={{ gap: theme.spacing }}>
              <View style={{ paddingHorizontal: GUTTER }}>
                <SectionHeader title="오늘의 특가" subtitle="매장에서만 만나는 할인" />
              </View>
              <HorizontalRail>
                {[0, 1, 2].map((i) => (
                  <ProductCardSkeleton key={i} width={railCardW} />
                ))}
              </HorizontalRail>
            </View>
          ) : onSale.length > 0 ? (
            <View style={{ gap: theme.spacing }}>
              <View style={{ paddingHorizontal: GUTTER }}>
                <SectionHeader
                  title="오늘의 특가"
                  subtitle="매장에서만 만나는 할인"
                  onMore={() => router.replace('/products')}
                />
              </View>
              <HorizontalRail>
                {onSale.slice(0, 10).map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    price={salePrice(p)}
                    width={railCardW}
                    onPress={() => router.push(`/product/${p.id}`)}
                  />
                ))}
              </HorizontalRail>
            </View>
          ) : null}

          {/* 관리자 진입 */}
          {isAdmin ? (
            <View style={{ paddingHorizontal: GUTTER }}>
              <Pressable onPress={() => router.push('/admin')} accessibilityLabel="관리자 페이지">
                <View style={[styles.adminBar, { backgroundColor: colors.text, borderRadius: theme.radius }]}>
                  <Icon name="settings" size={20} color="#FFFFFF" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: theme.fontBody, color: '#FFFFFF', fontWeight: '800' }}>관리자 콘솔</Text>
                    <Text style={{ fontSize: theme.fontBody - 4, color: '#FFFFFF', opacity: 0.7 }}>
                      주문 · 상품 · 매장 지도 관리
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={18} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          ) : null}

          {/* 추천 상품 그리드 */}
          <View style={{ gap: theme.spacing }}>
            <View style={{ paddingHorizontal: GUTTER }}>
              <SectionHeader title={`${member?.name ?? '고객'}님을 위한 추천`} subtitle="이 매장 인기 상품" />
            </View>
            {isRestoring ? (
              <View style={{ paddingHorizontal: GUTTER }}>
                <ProductGridSkeleton width={gridCardW} count={4} />
              </View>
            ) : (
            <View style={[styles.grid, { paddingHorizontal: GUTTER, gap: theme.spacing }]}>
              {recommended.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  price={salePrice(p)}
                  width={gridCardW}
                  onPress={() => router.push(`/product/${p.id}`)}
                />
              ))}
            </View>
            )}
          </View>

          {/* 매장 안내 */}
          <View style={{ paddingHorizontal: GUTTER }}>
            <Pressable onPress={() => router.push('/map')} accessibilityLabel="매장 지도 보기">
              <View style={[styles.mapCard, { backgroundColor: colors.primarySurface, borderRadius: theme.radius }]}>
                <Icon name="map" size={26} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>매장 지도</Text>
                  <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>
                    찾는 상품이 어느 매대에 있는지 확인하세요
                  </Text>
                </View>
                <Icon name="chevronRight" size={18} color={colors.textMuted} />
              </View>
            </Pressable>
          </View>

          <Text style={{ fontSize: theme.fontBody - 5, color: colors.textMuted, textAlign: 'center' }}>
            총 {products.length}개 상품 · 합계 {formatWon(products.reduce((s, p) => s + salePrice(p), 0))} 상당
          </Text>
        </ScrollView>
      </TabTransition>

      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  livePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 2,
  },
  heroArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryItem: { alignItems: 'center', gap: 6, width: 68 },
  categoryCircle: { width: 54, height: 54, borderRadius: 27, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  adminBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  mapCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
});
