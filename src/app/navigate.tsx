import * as Speech from 'expo-speech';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';

import { useTheme } from '@/context/ModeContext';
import { findProduct, PRODUCT_CATALOG, type Product } from '@/lib/mock/products';
import { CURRENT_ZONE_ID, findZone, GRID_COLS, GRID_ROWS, STORE_ZONES } from '@/lib/mock/storeMap';

/** gridBox의 aspectRatio(1.3)와 맞춰야 선 두께가 축별로 다르게 늘어나지 않는다. */
const VIEWBOX_WIDTH = 130;
const VIEWBOX_HEIGHT = 100;

function zoneCenter(row: number, col: number, colSpan = 1) {
  return {
    x: ((col + colSpan / 2) / GRID_COLS) * VIEWBOX_WIDTH,
    y: ((row + 0.5) / GRID_ROWS) * VIEWBOX_HEIGHT,
  };
}

function estimateDistanceMeters(fromRow: number, fromCol: number, toRow: number, toCol: number) {
  return Math.max(4, (Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol)) * 4);
}

/** (5) 매장 길 안내 화면 — 상품을 검색하면 간이 매장 지도에 경로를 표시한다. */
export default function NavigateScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const [query, setQuery] = useState('');
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [guiding, setGuiding] = useState(false);

  const suggestions: Product[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return PRODUCT_CATALOG.filter((p) => p.name.toLowerCase().includes(q));
  }, [query]);

  const destination = destinationId ? findProduct(destinationId) : undefined;
  const destinationZone = destination ? findZone(destination.zone) : undefined;
  const currentZone = findZone(CURRENT_ZONE_ID);

  const discountedNearby = PRODUCT_CATALOG.filter((p) => p.discountPercent);

  function selectProduct(product: Product) {
    setDestinationId(product.id);
    setQuery('');
    setGuiding(false);
  }

  function startGuidance() {
    setGuiding(true);
    if (theme.voiceGuide && destination && destinationZone) {
      speakGuidance();
    }
  }

  function speakGuidance() {
    if (!destination || !destinationZone) return;
    const distance = estimateDistanceMeters(
      currentZone?.row ?? 0,
      currentZone?.col ?? 0,
      destinationZone.row,
      destinationZone.col,
    );
    Speech.speak(
      `${destination.name}은(는) ${destinationZone.label} 구역에 있어요. 약 ${distance}미터 앞입니다.`,
      { language: 'ko-KR' },
    );
  }

  const currentCenter = currentZone
    ? zoneCenter(currentZone.row, currentZone.col, currentZone.colSpan)
    : null;
  const destinationCenter = destinationZone
    ? zoneCenter(destinationZone.row, destinationZone.col, destinationZone.colSpan)
    : null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.text }]}>
        매장 길 안내
      </Text>

      <ScrollView contentContainerStyle={{ gap: theme.spacing, paddingBottom: theme.spacing }}>
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="찾고 싶은 상품을 입력하세요"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.searchInput,
            {
              fontSize: theme.fontBody,
              color: colors.text,
              borderColor: colors.border,
              minHeight: theme.minTouch,
            },
          ]}
        />
        {suggestions.length > 0 && (
          <View style={[styles.suggestionBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
            {suggestions.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => selectProduct(product)}
                style={[styles.suggestionRow, { minHeight: theme.minTouch }]}
              >
                <Text style={{ fontSize: theme.fontBody }}>
                  {product.icon} {product.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {discountedNearby.length > 0 && (
        <View
          style={[
            styles.discountBanner,
            { backgroundColor: colors.warningSurface, padding: theme.spacing / 1.5 },
          ]}
        >
          <Text style={{ fontSize: theme.fontBody - 3, color: colors.warningText }}>
            🎉 근처 할인 이벤트:{' '}
            {discountedNearby.map((p) => `${p.name} ${p.discountPercent}%`).join(', ')} 할인 중!
          </Text>
        </View>
      )}

      <View style={[styles.gridBox, { borderColor: colors.border }]}>
        {STORE_ZONES.map((zone) => (
          <View
            key={zone.id}
            style={[
              styles.zoneCell,
              {
                left: `${(zone.col / GRID_COLS) * 100}%`,
                top: `${(zone.row / GRID_ROWS) * 100}%`,
                width: `${((zone.colSpan ?? 1) / GRID_COLS) * 100}%`,
                height: `${(1 / GRID_ROWS) * 100}%`,
                backgroundColor: zone.color,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.zoneLabel, { fontSize: theme.fontBody - 4 }]}>{zone.label}</Text>
          </View>
        ))}

        <Svg
          style={StyleSheet.absoluteFill}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        >
          {currentCenter && destinationCenter && (
            <Line
              x1={currentCenter.x}
              y1={currentCenter.y}
              x2={destinationCenter.x}
              y2={destinationCenter.y}
              stroke={guiding ? colors.primary : colors.textMuted}
              strokeWidth={0.6}
              strokeDasharray="2,1.5"
              strokeLinecap="round"
            />
          )}
          {currentCenter && (
            <Circle cx={currentCenter.x} cy={currentCenter.y} r={1.8} fill={colors.primary} />
          )}
          {destinationCenter && (
            <Circle cx={destinationCenter.x} cy={destinationCenter.y} r={1.8} fill={colors.warningText} />
          )}
        </Svg>
      </View>

      <View style={styles.legendRow}>
        <Text style={{ fontSize: theme.fontBody - 4, color: colors.primary }}>● 현재 위치</Text>
        <Text style={{ fontSize: theme.fontBody - 4, color: colors.warningText }}>● 목적지</Text>
      </View>

      {destination && destinationZone ? (
          <View style={[styles.destCard, { borderColor: colors.border, padding: theme.spacing }]}>
            <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>목적지 상품</Text>
            <Text style={{ fontSize: theme.fontButton, color: colors.text, fontWeight: '700' }}>
              {destination.icon} {destination.name}
            </Text>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>
              {destinationZone.label} 구역 · 약{' '}
              {estimateDistanceMeters(
                currentZone?.row ?? 0,
                currentZone?.col ?? 0,
                destinationZone.row,
                destinationZone.col,
              )}
              m
            </Text>
            <View style={styles.destBadgeRow}>
              <View style={[styles.priceTag, { backgroundColor: colors.successSurface }]}>
                <Text style={{ fontSize: theme.fontBody - 2, color: colors.text }}>
                  ₩{destination.unitPrice.toLocaleString('ko-KR')}
                </Text>
              </View>
              {destination.discountPercent && (
                <View style={[styles.priceTag, { backgroundColor: colors.warningSurface }]}>
                  <Text style={{ fontSize: theme.fontBody - 2, color: colors.warningText }}>
                    {destination.discountPercent}% 할인중
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={startGuidance}
              style={[styles.guideButton, { backgroundColor: colors.primary, minHeight: theme.minTouch }]}
            >
              <Text style={{ fontSize: theme.fontButton, color: colors.primaryText, fontWeight: '700' }}>
                {guiding ? '안내 중...' : '안내 시작'}
              </Text>
            </Pressable>
            {theme.voiceGuide && (
              <Pressable
                onPress={speakGuidance}
                style={[
                  styles.voiceButton,
                  { borderColor: colors.primary, minHeight: theme.minTouch },
                ]}
              >
                <Text style={{ fontSize: theme.fontBody, color: colors.primary, fontWeight: '600' }}>
                  🔊 음성으로 길 안내 받기
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center' }}>
            상품을 검색하면 위치와 경로를 알려드려요
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontWeight: '700', textAlign: 'center' },
  searchWrap: { position: 'relative', zIndex: 10 },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16 },
  suggestionBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionRow: { justifyContent: 'center', paddingHorizontal: 16 },
  discountBanner: { borderRadius: 10 },
  gridBox: {
    width: '100%',
    aspectRatio: 1.3,
    borderWidth: 1,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  zoneCell: {
    position: 'absolute',
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneLabel: { color: '#1F2937', fontWeight: '600' },
  legendRow: { flexDirection: 'row', gap: 16 },
  destCard: { borderWidth: 1, borderRadius: 12, gap: 6 },
  destBadgeRow: { flexDirection: 'row', gap: 8 },
  priceTag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  guideButton: { borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  voiceButton: {
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
