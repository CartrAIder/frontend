import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { AppBar } from '@/components/AppBar';
import { BrandRefreshLoader } from '@/components/BrandLoader';
import { useBrandRefresh } from '@/components/BrandRefresh';
import { Card } from '@/components/Card';
import { ProductImage } from '@/components/ProductImage';
import { InfoRowsSkeleton } from '@/components/Skeleton';
import { StoreMap, buildRoute, estimateDistanceMeters } from '@/components/StoreMap';
import { useCart } from '@/context/CartContext';
import { salePrice, useCatalog } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';
import { SHELF_ROWS, zoneIconName } from '@/lib/mock/storeMap';

/**
 * 매장 지도 — "지금 매장이 이렇게 생겼다"만 보여주는 화면.
 * 구역을 탭하면 그 구역에 어떤 상품이 있는지 아래에 펼쳐진다.
 */
export default function MapScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { zones, shelfZones, findZone, findProduct, productsInZone, refresh, isRestoring } =
    useCatalog();
  const { refreshing, refreshControl } = useBrandRefresh(refresh);

  const cart = useCart();

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const selectedZone = selectedZoneId ? findZone(selectedZoneId) : undefined;
  const zoneProducts = selectedZoneId ? productsInZone(selectedZoneId) : [];

  /**
   * 담은 상품이 어느 매대 것인지 세어 지도 위에 배지로 띄운다.
   * 쇼핑 중에 지도를 열었을 때 "어디를 이미 들렀는지"가 한눈에 보인다.
   */
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of cart.items) {
      const zoneId = findProduct(item.id)?.zone;
      if (zoneId) counts[zoneId] = (counts[zoneId] ?? 0) + item.qty;
    }
    return counts;
  }, [cart.items, findProduct]);
  const pickedZones = Object.keys(zoneCounts).length;

  /**
   * 구역을 고르면 입구에서 그 매대까지 가는 길을 그린다(계산대 구역은 제외).
   * 렌더마다 새 배열을 만들면 StoreMap이 경로를 다시 측정하고 카트 주행을 재시작한다.
   */
  const route = useMemo(
    () =>
      selectedZone && selectedZone.row < SHELF_ROWS
        ? buildRoute(selectedZone.row, selectedZone.col)
        : null,
    // 경로는 매대 칸(row·col)에만 달려 있다 — 상품 상세와 같은 이유로 좁게 잡는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedZone?.row, selectedZone?.col],
  );
  const distance =
    selectedZone && selectedZone.row < SHELF_ROWS
      ? estimateDistanceMeters(selectedZone.row, selectedZone.col)
      : 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <AppBar title="매장 지도" />
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: theme.spacing }}
        refreshControl={refreshControl}
      >
        <BrandRefreshLoader visible={refreshing} />

        <Card style={{ gap: 10 }}>
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>
            {route && selectedZone
              ? `입구에서 ${selectedZone.label}까지 약 ${distance}m — 길을 따라가 보세요.`
              : pickedZones > 0
                ? `구역을 탭하면 가는 길을 알려드려요. 지금까지 ${pickedZones}개 구역에서 담았어요.`
                : '구역을 탭하면 그곳까지 가는 길과 파는 상품을 볼 수 있어요.'}
          </Text>
          <StoreMap
            zones={zones}
            route={route}
            selectedZoneId={selectedZoneId}
            onZonePress={(zoneId) => setSelectedZoneId((prev) => (prev === zoneId ? null : zoneId))}
            zoneCounts={zoneCounts}
            legend={[
              { label: '현위치(입구)', color: colors.primary },
              { label: route ? '가는 길' : '선택한 구역', color: colors.primary, line: true },
              ...(pickedZones > 0 ? [{ label: '담은 상품', color: colors.success }] : []),
            ]}
          />
        </Card>

        {/* 구역 목록 (지도 탭 대신 리스트로도 고를 수 있게) */}
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: theme.fontBody,
              color: colors.textMuted,
              fontWeight: '700',
              marginLeft: 4,
            }}
          >
            매장 구역
          </Text>
          <View style={styles.zoneGrid}>
            {shelfZones.map((zone) => {
              const active = selectedZoneId === zone.id;
              const count = productsInZone(zone.id).length;
              return (
                <Pressable
                  key={zone.id}
                  onPress={() => setSelectedZoneId((prev) => (prev === zone.id ? null : zone.id))}
                  style={[
                    styles.zoneChip,
                    {
                      backgroundColor: active ? colors.primary : zone.color,
                      borderColor: active ? colors.primary : colors.border,
                      borderRadius: theme.radiusSm,
                      minHeight: theme.minTouch,
                    },
                  ]}
                >
                  <Icon
                    name={zoneIconName(zone.id)}
                    size={theme.fontBody + 4}
                    color={active ? colors.primaryText : '#334155'}
                    strokeWidth={1.9}
                  />
                  <Text
                    style={{
                      fontSize: theme.fontBody - 2,
                      color: active ? colors.primaryText : '#1F2937',
                      fontWeight: '700',
                    }}
                    numberOfLines={1}
                  >
                    {zone.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.fontBody - 5,
                      color: active ? colors.primaryText : '#4B5563',
                      opacity: 0.9,
                    }}
                  >
                    {count}개
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 선택한 구역의 상품 */}
        {selectedZone && (
          <Card style={{ gap: 10 }}>
            <View style={styles.sheetHead}>
              <Text style={{ fontSize: theme.fontButton, color: colors.text, fontWeight: '800' }}>
                {selectedZone.label}
              </Text>
              <Pressable
                onPress={() => setSelectedZoneId(null)}
                hitSlop={10}
                accessibilityLabel="닫기"
              >
                <Icon name="close" size={theme.fontBody + 2} color={colors.textMuted} />
              </Pressable>
            </View>

            {isRestoring && zoneProducts.length === 0 ? (
              // 복원 중에는 "없다"고 단정하지 않는다 — 잠시 뒤 채워질 자리다.
              <InfoRowsSkeleton count={3} />
            ) : zoneProducts.length === 0 ? (
              <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>
                아직 이 구역에 등록된 상품이 없어요.
              </Text>
            ) : (
              zoneProducts.map((product) => (
                <Pressable
                  key={product.id}
                  onPress={() => router.push(`/product/${product.id}`)}
                  style={[styles.productRow, { minHeight: theme.minTouch }]}
                >
                  <ProductImage
                    id={product.id}
                    name={product.name}
                    zone={product.zone}
                    uri={product.imageUrl}
                    size={34}
                    radius={8}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: theme.fontBody,
                      color: colors.text,
                      fontWeight: '600',
                    }}
                    numberOfLines={1}
                  >
                    {product.name}
                  </Text>
                  {product.stock === 0 && (
                    <Text
                      style={{
                        fontSize: theme.fontBody - 5,
                        color: colors.textMuted,
                        fontWeight: '700',
                      }}
                    >
                      품절
                    </Text>
                  )}
                  <Text
                    style={{ fontSize: theme.fontBody - 1, color: colors.text, fontWeight: '700' }}
                  >
                    ₩{salePrice(product).toLocaleString('ko-KR')}
                  </Text>
                  <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>›</Text>
                </Pressable>
              ))
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  zoneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zoneChip: {
    flexGrow: 1,
    flexBasis: '30%',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 1,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
