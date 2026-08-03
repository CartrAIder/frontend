import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { StoreMap } from '@/components/StoreMap';
import { salePrice, useCatalog } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';

/**
 * 매장 지도 — "지금 매장이 이렇게 생겼다"만 보여주는 화면.
 * 구역을 탭하면 그 구역에 어떤 상품이 있는지 아래에 펼쳐진다.
 */
export default function MapScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { zones, shelfZones, findZone, productsInZone } = useCatalog();

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const selectedZone = selectedZoneId ? findZone(selectedZoneId) : undefined;
  const zoneProducts = selectedZoneId ? productsInZone(selectedZoneId) : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: theme.spacing }}>
        <Card style={{ gap: 10 }}>
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>
            구역을 탭하면 그곳에서 파는 상품을 볼 수 있어요.
          </Text>
          <StoreMap
            zones={zones}
            selectedZoneId={selectedZoneId}
            onZonePress={(zoneId) => setSelectedZoneId((prev) => (prev === zoneId ? null : zoneId))}
            legend={[
              { label: '현위치(입구)', color: colors.primary },
              { label: '선택한 구역', color: colors.primary, line: true },
            ]}
          />
        </Card>

        {/* 구역 목록 (지도 탭 대신 리스트로도 고를 수 있게) */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, fontWeight: '700', marginLeft: 4 }}>
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
                  <Text style={{ fontSize: 18 }}>{zone.icon}</Text>
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
                {selectedZone.icon} {selectedZone.label}
              </Text>
              <Pressable onPress={() => setSelectedZoneId(null)} hitSlop={10} accessibilityLabel="닫기">
                <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>✕</Text>
              </Pressable>
            </View>

            {zoneProducts.length === 0 ? (
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
                  <Text style={{ fontSize: 22 }}>{product.icon}</Text>
                  <Text style={{ flex: 1, fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                    {product.name}
                  </Text>
                  {product.stock === 0 && (
                    <Text style={{ fontSize: theme.fontBody - 5, color: colors.textMuted, fontWeight: '700' }}>품절</Text>
                  )}
                  <Text style={{ fontSize: theme.fontBody - 1, color: colors.text, fontWeight: '700' }}>
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
