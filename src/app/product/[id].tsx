import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar } from '@/components/AppBar';
import { BrandRefreshLoader } from '@/components/BrandLoader';
import { useBrandRefresh } from '@/components/BrandRefresh';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProductImage } from '@/components/ProductImage';
import { ProductDetailSkeleton } from '@/components/Skeleton';
import { StoreMap, buildRoute, estimateDistanceMeters } from '@/components/StoreMap';
import { Badge, EmptyState, Price, ProductCard, SectionHeader } from '@/components/commerce';
import { useCartSession } from '@/context/CartSessionContext';
import { salePrice, useCatalog } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';
import { useHeroSize, useProductGrid } from '@/lib/layout';

const GUTTER = 20;

/**
 * 상품 상세 — 큰 이미지 → 가격 → 정보 → 매장 위치 → 연관 상품, 하단 고정 CTA.
 * 상품은 카트가 인식해서 담기므로 CTA는 "담기"가 아니라 "매장에서 찾기"다.
 */
export default function ProductDetailScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findProduct, findZone, zones, productsInZone, refresh, isRestoring } = useCatalog();
  const { refreshing, refreshControl } = useBrandRefresh(refresh);
  const { isConnected } = useCartSession();
  // 훅은 early return 앞에서 전부 호출해야 한다(상품을 못 찾는 분기가 아래에 있다).
  const { railCardWidth: railCardW } = useProductGrid(theme.gridColumns, theme.spacing, GUTTER);
  const heroSize = useHeroSize();

  const product = id ? findProduct(id) : undefined;

  // 앱을 켜자마자 이 화면으로 들어오면(딥링크·복귀) 카탈로그가 아직 복원 중이라
  // findProduct가 빈손으로 돌아온다. 그때 "없는 상품"이라고 말하면 거짓말이 된다.
  if (!product && isRestoring) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <AppBar title="상품 정보" />
        <ScrollView
          contentContainerStyle={{ padding: GUTTER }}
          showsVerticalScrollIndicator={false}
        >
          <ProductDetailSkeleton imageSize={heroSize} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <EmptyState
          title="상품을 찾을 수 없어요"
          description={'삭제되었거나 잘못된 주소입니다.'}
          action={
            <View style={{ marginTop: 8, alignSelf: 'stretch', paddingHorizontal: 40 }}>
              <PrimaryButton
                title="상품 목록으로"
                variant="neutral"
                onPress={() => router.replace('/products')}
              />
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  const zone = findZone(product.zone);
  const price = salePrice(product);
  const soldOut = product.stock === 0;
  const route = zone && zone.row < 2 ? buildRoute(zone.row, zone.col) : null;
  const distance = zone ? estimateDistanceMeters(zone.row, zone.col) : 0;
  const related = zone
    ? productsInZone(zone.id)
        .filter((p) => p.id !== product.id)
        .slice(0, 6)
    : [];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <AppBar title="상품 상세" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <View style={{ paddingHorizontal: GUTTER }}>
          <BrandRefreshLoader visible={refreshing} />
        </View>
        {/* 대표 이미지 — 정사각. 넓은 화면에서는 상한(useHeroSize)까지만 키우고 가운데 정렬한다. */}
        <View style={{ width: heroSize, alignSelf: 'center' }}>
          <ProductImage
            id={product.id}
            name={product.name}
            zone={product.zone}
            uri={product.imageUrl}
            size={heroSize}
            radius={0}
            dimmed={soldOut}
            priority="high"
          />
          {soldOut ? (
            <View style={styles.soldOutOverlay}>
              <Text style={{ fontSize: theme.fontTitle, color: '#FFFFFF', fontWeight: '800' }}>
                품절
              </Text>
            </View>
          ) : null}
        </View>

        {/* 이름 · 가격 */}
        <View style={{ padding: GUTTER, gap: 10 }}>
          {product.brand ? (
            <Text
              style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, fontWeight: '600' }}
            >
              {product.brand}
            </Text>
          ) : null}
          <Text
            style={{
              fontSize: theme.fontTitle - 2,
              color: colors.text,
              fontWeight: '700',
              lineHeight: theme.fontTitle + 6,
            }}
          >
            {product.name}
          </Text>

          <Price
            price={price}
            original={product.unitPrice}
            discountPercent={product.discountPercent}
            size="lg"
          />

          <View style={styles.badgeRow}>
            {soldOut ? (
              <Badge label="품절" tone="soldout" />
            ) : (
              <Badge label={`재고 ${product.stock}개`} tone="primary" />
            )}
            {zone ? <Badge label={`${zone.label} 구역`} /> : null}
            {product.discountPercent ? <Badge label="매장 특가" tone="sale" /> : null}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* 상품 정보 */}
        <View style={{ padding: GUTTER, gap: 12 }}>
          <Text style={{ fontSize: theme.fontButton - 2, color: colors.text, fontWeight: '800' }}>
            상품 정보
          </Text>
          {product.description ? (
            <Text
              style={{
                fontSize: theme.fontBody,
                color: colors.textMuted,
                lineHeight: theme.fontBody * 1.6,
              }}
            >
              {product.description}
            </Text>
          ) : null}
          <View style={{ gap: 8, marginTop: 2 }}>
            <InfoRow label="판매가" value={`${price.toLocaleString('ko-KR')}원`} />
            {product.discountPercent ? (
              <InfoRow label="정상가" value={`${product.unitPrice.toLocaleString('ko-KR')}원`} />
            ) : null}
            {zone ? (
              <InfoRow label="매대 위치" value={`${zone.label} · 입구에서 약 ${distance}m`} />
            ) : null}
            <InfoRow label="재고" value={soldOut ? '품절' : `${product.stock}개`} />
          </View>
        </View>

        {/* 매장 위치 */}
        {zone ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={{ padding: GUTTER, gap: 12 }}>
              <SectionHeader
                title="매장 위치"
                subtitle={`${zone.label} · 입구에서 약 ${distance}m`}
              />
              <StoreMap zones={zones} route={route} destinationZoneId={zone.id} />
            </View>
          </>
        ) : null}

        {/* 같은 구역 상품 */}
        {related.length > 0 ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={{ paddingVertical: GUTTER, gap: theme.spacing }}>
              <View style={{ paddingHorizontal: GUTTER }}>
                <SectionHeader title="같은 매대의 다른 상품" />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: theme.spacing, paddingHorizontal: GUTTER }}
              >
                {related.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    price={salePrice(item)}
                    width={railCardW}
                    onPress={() => router.replace(`/product/${item.id}`)}
                  />
                ))}
              </ScrollView>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* 하단 고정 CTA */}
      <View
        style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}
      >
        <Pressable
          onPress={() => router.push('/map')}
          style={[
            styles.bottomIconButton,
            { borderColor: colors.border, borderRadius: theme.radiusSm },
          ]}
          accessibilityLabel="매장 지도에서 보기"
        >
          <Icon name="map" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            title={isConnected ? '장바구니 보기' : '카트 연결하고 담기'}
            onPress={() => router.push(isConnected ? '/cart' : '/connect')}
            disabled={soldOut}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View style={styles.infoRow}>
      <Text style={{ width: 84, fontSize: theme.fontBody - 2, color: colors.textMuted }}>
        {label}
      </Text>
      <Text
        style={{ flex: 1, fontSize: theme.fontBody - 2, color: colors.text, fontWeight: '600' }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  soldOutOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.3)',
  },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  divider: { height: 8, opacity: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomIconButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
