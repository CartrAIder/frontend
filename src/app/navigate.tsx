import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  StoreMap,
  buildRoute,
  estimateDistanceMeters,
  shelvesFromZones,
  sideOfShelf,
} from '@/components/StoreMap';
import { useCatalog } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';
import type { Product } from '@/lib/mock/products';

/**
 * (5) 매장 길 안내 화면 — 상품을 검색하면 매장 평면도에 통로 경로를 그려 안내한다.
 * 상품 상세에서 `?productId=`로 진입하면 그 상품을 바로 목적지로 잡는다.
 * 지도만 보고 싶으면 `/map`(경로 없는 매장 지도)로 간다.
 */
export default function NavigateScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const { products, zones, findProduct, findZone } = useCatalog();

  const [query, setQuery] = useState('');
  const [destinationId, setDestinationId] = useState<string | null>(productId ?? null);
  const [guiding, setGuiding] = useState(false);

  const suggestions: Product[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q));
  }, [query, products]);

  const destination = destinationId ? findProduct(destinationId) : undefined;
  const destinationZone = destination ? findZone(destination.zone) : undefined;
  const discountedNearby = products.filter((p) => p.discountPercent);

  const route = destinationZone && destinationZone.row < 2 ? buildRoute(destinationZone.row, destinationZone.col) : null;
  const destShelf = destinationZone
    ? shelvesFromZones(zones).find((s) => s.id === destinationZone.id)
    : undefined;
  const distance = destinationZone ? estimateDistanceMeters(destinationZone.row, destinationZone.col) : 0;
  const side = sideOfShelf(destShelf);

  function selectProduct(product: Product) {
    setDestinationId(product.id);
    setQuery('');
    setGuiding(false);
  }

  function startGuidance() {
    setGuiding(true);
    if (theme.voiceGuide) speakGuidance();
  }

  function speakGuidance() {
    if (!destination || !destinationZone) return;
    Speech.speak(
      `${destination.name}은(는) ${destinationZone.label} 구역, 약 ${distance}미터 앞입니다. 입구에서 직진 후 ${side}입니다.`,
      { language: 'ko-KR' },
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing, paddingVertical: theme.spacing }}>
        {/* 검색 */}
        <View style={styles.searchWrap}>
          <View style={[styles.searchInputRow, { backgroundColor: colors.surface, borderRadius: theme.radiusSm }]}>
            <Text style={{ fontSize: theme.fontBody }}>🔎</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="찾고 싶은 상품을 입력하세요"
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, fontSize: theme.fontBody, color: colors.text, paddingVertical: 12 }}
            />
          </View>
          {suggestions.length > 0 && (
            <View
              style={[
                styles.suggestionBox,
                theme.shadowCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: theme.radiusSm },
              ]}
            >
              {suggestions.slice(0, 6).map((product) => (
                <Pressable
                  key={product.id}
                  onPress={() => selectProduct(product)}
                  style={[styles.suggestionRow, { minHeight: theme.minTouch }]}
                >
                  <Text style={{ fontSize: theme.fontBody, color: colors.text }}>
                    {product.icon}  {product.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* 할인 이벤트 */}
        {discountedNearby.length > 0 && (
          <View style={[styles.discountBanner, { backgroundColor: colors.warningSurface, borderRadius: theme.radiusSm }]}>
            <Text style={{ fontSize: theme.fontBody - 3, color: colors.warningText, fontWeight: '600' }}>
              🎉 근처 할인: {discountedNearby.map((p) => `${p.name} ${p.discountPercent}%`).join(', ')}
            </Text>
          </View>
        )}

        {/* 매장 평면도 */}
        <Card padded={false} style={{ padding: theme.spacing }}>
          <StoreMap
            zones={zones}
            route={guiding || destination ? route : null}
            destinationZoneId={destinationZone?.id ?? null}
            legend={[
              { label: '현위치', color: colors.primary },
              { label: '목적지', color: colors.danger },
              { label: '추천 경로', color: colors.primary, line: true },
            ]}
          />
        </Card>

        {/* 목적지 안내 카드 */}
        {destination && destinationZone ? (
          <Card style={{ gap: 8 }}>
            <View style={styles.destHead}>
              <Text style={{ fontSize: 28 }}>{destination.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: theme.fontButton, color: colors.text, fontWeight: '800' }}>{destination.name}</Text>
                <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>
                  {destinationZone.label} 구역 · 약 {distance}m
                </Text>
              </View>
              <View style={styles.priceCol}>
                <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>
                  ₩{destination.unitPrice.toLocaleString('ko-KR')}
                </Text>
                {destination.discountPercent && (
                  <View style={[styles.discountTag, { backgroundColor: colors.warningSurface, borderRadius: 6 }]}>
                    <Text style={{ fontSize: theme.fontBody - 5, color: colors.warningText, fontWeight: '700' }}>
                      {destination.discountPercent}% 할인
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.routeHint, { backgroundColor: colors.primarySurface, borderRadius: theme.radiusSm }]}>
              <Text style={{ fontSize: theme.fontBody - 2, color: colors.primary, fontWeight: '600' }}>
                📍 입구에서 직진 후 {side} · {destinationZone.label} 코너
              </Text>
            </View>

            <PrimaryButton title={guiding ? '안내 중...' : '길 안내 시작'} leadingIcon="🧭" onPress={startGuidance} />
            {theme.voiceGuide && (
              <Pressable
                onPress={speakGuidance}
                style={[styles.voiceButton, { borderColor: colors.primary, minHeight: theme.minTouch, borderRadius: theme.radiusSm }]}
              >
                <Text style={{ fontSize: theme.fontBody, color: colors.primary, fontWeight: '700' }}>🔊 음성으로 다시 듣기</Text>
              </Pressable>
            )}
          </Card>
        ) : (
          <View style={styles.emptyHint}>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center' }}>
              위에서 상품을 검색하면{'\n'}위치와 경로를 지도에 표시해드려요
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  searchWrap: { position: 'relative', zIndex: 10 },
  searchInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  suggestionBox: { position: 'absolute', top: '100%', left: 0, right: 0, borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  suggestionRow: { justifyContent: 'center', paddingHorizontal: 16 },
  discountBanner: { paddingVertical: 10, paddingHorizontal: 12 },
  destHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceCol: { alignItems: 'flex-end', gap: 4 },
  discountTag: { paddingHorizontal: 7, paddingVertical: 3 },
  routeHint: { paddingVertical: 10, paddingHorizontal: 12 },
  voiceButton: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  emptyHint: { paddingVertical: 24, alignItems: 'center' },
});
