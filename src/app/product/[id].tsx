import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StoreMap, buildRoute, estimateDistanceMeters } from '@/components/StoreMap';
import { salePrice, useCatalog } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';

/**
 * 상품 상세 — 상품 보기(/products)나 지도에서 진입한다.
 * "이 상품 팝니다"에 필요한 정보(가격·할인·재고·위치)를 한 화면에 모으고,
 * 바로 길 안내(/navigate)로 넘어갈 수 있게 한다.
 */
export default function ProductDetailScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findProduct, findZone, zones, productsInZone } = useCatalog();

  const product = id ? findProduct(id) : undefined;

  if (!product) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.empty}>
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center' }}>
            상품을 찾을 수 없어요.{'\n'}삭제되었거나 잘못된 주소입니다.
          </Text>
          <PrimaryButton title="상품 목록으로" variant="neutral" onPress={() => router.replace('/products')} />
        </View>
      </SafeAreaView>
    );
  }

  const zone = findZone(product.zone);
  const price = salePrice(product);
  const soldOut = product.stock === 0;
  const route = zone && zone.row < 2 ? buildRoute(zone.row, zone.col) : null;
  const distance = zone ? estimateDistanceMeters(zone.row, zone.col) : 0;
  const related = zone ? productsInZone(zone.id).filter((p) => p.id !== product.id).slice(0, 4) : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: theme.spacing }}>
        {/* 대표 이미지 자리 (mock — 이모지) */}
        <View style={[styles.heroImage, { backgroundColor: colors.surface, borderRadius: theme.radius }]}>
          <Text style={styles.heroEmoji}>{product.icon}</Text>
          {product.discountPercent ? (
            <View style={[styles.heroBadge, { backgroundColor: colors.danger, borderRadius: 999 }]}>
              <Text style={{ fontSize: theme.fontBody - 2, color: colors.primaryText, fontWeight: '800' }}>
                {product.discountPercent}% 할인
              </Text>
            </View>
          ) : null}
        </View>

        {/* 이름 · 가격 */}
        <Card style={{ gap: 6 }}>
          {product.brand ? (
            <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted, fontWeight: '600' }}>
              {product.brand}
            </Text>
          ) : null}
          <Text style={{ fontSize: theme.fontTitle, color: colors.text, fontWeight: '800' }}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={{ fontSize: theme.fontAmount, color: colors.text, fontWeight: '800' }}>
              ₩{price.toLocaleString('ko-KR')}
            </Text>
            {product.discountPercent ? (
              <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textDecorationLine: 'line-through' }}>
                ₩{product.unitPrice.toLocaleString('ko-KR')}
              </Text>
            ) : null}
          </View>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: soldOut ? colors.border : colors.successSurface, borderRadius: 6 },
              ]}
            >
              <Text
                style={{
                  fontSize: theme.fontBody - 4,
                  color: soldOut ? colors.textMuted : colors.success,
                  fontWeight: '800',
                }}
              >
                {soldOut ? '품절' : `재고 ${product.stock}개`}
              </Text>
            </View>
            {zone && (
              <View style={[styles.badge, { backgroundColor: colors.primarySurface, borderRadius: 6 }]}>
                <Text style={{ fontSize: theme.fontBody - 4, color: colors.primary, fontWeight: '800' }}>
                  {zone.icon} {zone.label} 구역
                </Text>
              </View>
            )}
          </View>

          {product.description ? (
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, lineHeight: theme.fontBody * 1.5, marginTop: 4 }}>
              {product.description}
            </Text>
          ) : null}
        </Card>

        {/* 매장 위치 */}
        {zone && (
          <Card style={{ gap: 10 }}>
            <View style={styles.sectionHead}>
              <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }}>📍 매장 위치</Text>
              <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>
                {zone.label} · 입구에서 약 {distance}m
              </Text>
            </View>
            <StoreMap zones={zones} route={route} destinationZoneId={zone.id} />
          </Card>
        )}

        {/* 같은 구역 상품 */}
        {related.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, fontWeight: '700', marginLeft: 4 }}>
              같은 구역의 다른 상품
            </Text>
            <Card padded={false}>
              {related.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.replace(`/product/${item.id}`)}
                  style={[styles.relatedRow, { minHeight: theme.minTouch, padding: theme.spacing }]}
                >
                  {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                  <Text style={{ flex: 1, fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, fontWeight: '700' }}>
                    ₩{salePrice(item).toLocaleString('ko-KR')}
                  </Text>
                </Pressable>
              ))}
            </Card>
          </View>
        )}

        <PrimaryButton
          title="이 상품까지 길 안내"
          leadingIcon="🧭"
          onPress={() => router.push(`/navigate?productId=${product.id}`)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroImage: { height: 180, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 84 },
  heroBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 12, paddingVertical: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4 },
  sectionHead: { gap: 2 },
  relatedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { position: 'absolute', top: 0, left: 16, right: 16, height: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
});
