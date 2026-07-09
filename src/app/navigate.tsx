import * as Speech from 'expo-speech';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Polyline, Rect } from 'react-native-svg';

import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTheme } from '@/context/ModeContext';
import { findProduct, PRODUCT_CATALOG, type Product } from '@/lib/mock/products';
import { findZone, STORE_ZONES } from '@/lib/mock/storeMap';

// ── 매장 평면도 좌표계 (viewBox 100 × 120, 세로형) ──────────────────────
const VB_W = 100;
const VB_H = 120;
const SHELF_W = 22;
const SHELF_H = 30;
const COL_X: Record<number, number> = { 0: 11, 1: 39, 2: 67 }; // 선반 좌측 x
const ROW_Y: Record<number, number> = { 0: 12, 1: 52 }; // 선반 상단 y
const MAIN_AISLE_Y = 90; // 선반 앞 메인 통로
const MID_AISLE_Y = 47; // 위/아래 선반 사이 통로
const ENTRANCE = { x: 50, y: 95 }; // 현위치(입구 앞)

const ZONE_ICON: Record<string, string> = {
  produce: '🥬',
  유제품: '🥛',
  음료: '🥤',
  가공식품: '🥫',
  frozen: '🧊',
  제과: '🍞',
  checkout: '🧾',
};

/** 상품 없는 시연용 선반까지 포함한 6개 매대 (계산대 row2 제외). */
const SHELVES = STORE_ZONES.filter((z) => z.row < 2).map((z) => ({
  id: z.id,
  label: z.label,
  color: z.color,
  x: COL_X[z.col],
  y: ROW_Y[z.row],
  cx: COL_X[z.col] + SHELF_W / 2,
  cy: ROW_Y[z.row] + SHELF_H / 2,
}));

function pct(v: number, span: number) {
  return `${(v / span) * 100}%` as const;
}

/** 입구 → 목적지 선반 앞까지 통로만 따라가는 직각(Manhattan) 경로 좌표. */
function buildRoute(row: number, col: number): number[][] {
  const colCenter = COL_X[col] + SHELF_W / 2;
  const aisleX = col === 2 ? 64 : 36; // 목적 열로 올라갈 세로 통로
  const rowAisleY = row === 0 ? MID_AISLE_Y : MAIN_AISLE_Y; // 목적 행 앞 통로
  const shelfFrontY = ROW_Y[row] + SHELF_H + 3; // 선반 바로 앞
  const raw = [
    [ENTRANCE.x, ENTRANCE.y],
    [ENTRANCE.x, MAIN_AISLE_Y],
    [aisleX, MAIN_AISLE_Y],
    [aisleX, rowAisleY],
    [colCenter, rowAisleY],
    [colCenter, shelfFrontY],
  ];
  return raw.filter((p, i) => i === 0 || p[0] !== raw[i - 1][0] || p[1] !== raw[i - 1][1]);
}

function estimateDistanceMeters(toRow: number, toCol: number) {
  // 입구(하단 중앙, row2·col1)에서의 격자 맨해튼 거리 기반 근사.
  return Math.max(4, (Math.abs(2 - toRow) + Math.abs(1 - toCol)) * 4);
}

/** (5) 매장 길 안내 화면 — 상품을 검색하면 매장 평면도에 통로 경로를 그려 안내한다. */
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
  const discountedNearby = PRODUCT_CATALOG.filter((p) => p.discountPercent);

  const route = destinationZone ? buildRoute(destinationZone.row, destinationZone.col) : null;
  const destShelf = destinationZone ? SHELVES.find((s) => s.id === destinationZone.id) : undefined;
  const distance = destinationZone ? estimateDistanceMeters(destinationZone.row, destinationZone.col) : 0;
  const side = destShelf ? (destShelf.cx < 48 ? '왼쪽' : destShelf.cx > 52 ? '오른쪽' : '정면') : '';

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
            <View style={[styles.suggestionBox, theme.shadowCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: theme.radiusSm }]}>
              {suggestions.map((product) => (
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
        <Card padded={false} style={{ padding: theme.spacing, gap: 10 }}>
          <View style={styles.mapBox}>
            <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${VB_W} ${VB_H}`}>
              {/* 바닥 + 외벽 */}
              <Rect x={3} y={3} width={94} height={114} rx={7} fill={colors.surface} stroke={colors.border} strokeWidth={1.4} />
              {/* 계산대 카운터 */}
              <Rect x={12} y={100} width={76} height={11} rx={2.5} fill={colors.primarySurface} stroke={colors.border} strokeWidth={0.6} />
              {/* 입구 (하단 벽 개구부) */}
              <Rect x={42} y={112} width={16} height={7} fill={colors.background} />

              {/* 선반 매대 */}
              {SHELVES.map((s) => {
                const highlighted = destShelf?.id === s.id;
                return (
                  <Rect
                    key={s.id}
                    x={s.x}
                    y={s.y}
                    width={SHELF_W}
                    height={SHELF_H}
                    rx={2.5}
                    fill={s.color}
                    stroke={highlighted ? colors.danger : colors.border}
                    strokeWidth={highlighted ? 1.8 : 0.5}
                  />
                );
              })}

              {/* 경로 */}
              {route && (
                <Polyline
                  points={route.map((p) => p.join(',')).join(' ')}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={guiding ? 2.8 : 2}
                  strokeDasharray="3,2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={guiding ? 1 : 0.85}
                />
              )}

              {/* 현위치 */}
              <Circle cx={ENTRANCE.x} cy={ENTRANCE.y} r={5.2} fill={colors.primary} opacity={0.2} />
              <Circle cx={ENTRANCE.x} cy={ENTRANCE.y} r={3} fill={colors.primary} stroke="#FFFFFF" strokeWidth={0.8} />

              {/* 목적지 핀 */}
              {destShelf && (
                <>
                  <Circle cx={destShelf.cx} cy={destShelf.cy} r={5.5} fill={colors.danger} opacity={0.18} />
                  <Circle cx={destShelf.cx} cy={destShelf.cy} r={3.4} fill={colors.danger} stroke="#FFFFFF" strokeWidth={0.8} />
                  <Circle cx={destShelf.cx} cy={destShelf.cy} r={1.3} fill="#FFFFFF" />
                </>
              )}
            </Svg>

            {/* 선반 라벨 (SVG 위에 RN 텍스트 오버레이 — 이모지/한글 안정적) */}
            {SHELVES.map((s) => (
              <View
                key={s.id}
                pointerEvents="none"
                style={[styles.shelfLabel, { left: pct(s.x, VB_W), top: pct(s.y, VB_H), width: pct(SHELF_W, VB_W), height: pct(SHELF_H, VB_H) }]}
              >
                <Text style={{ fontSize: theme.fontBody - 1 }}>{ZONE_ICON[s.id] ?? '📦'}</Text>
                <Text style={{ fontSize: theme.fontBody - 6, color: '#1F2937', fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>
                  {s.label}
                </Text>
              </View>
            ))}
            <View pointerEvents="none" style={[styles.counterLabel, { left: pct(12, VB_W), top: pct(100, VB_H), width: pct(76, VB_W), height: pct(11, VB_H) }]}>
              <Text style={{ fontSize: theme.fontBody - 5, color: colors.primary, fontWeight: '700' }}>🧾 계산대 · 출구</Text>
            </View>
            <View pointerEvents="none" style={[styles.entranceLabel, { top: pct(113, VB_H) }]}>
              <Text style={{ fontSize: theme.fontBody - 6, color: colors.textMuted, fontWeight: '600' }}>입구</Text>
            </View>
          </View>

          {/* 범례 */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>현위치</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
              <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>목적지</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: colors.primary }]} />
              <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>추천 경로</Text>
            </View>
          </View>
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
  mapBox: { width: '100%', aspectRatio: VB_W / VB_H, position: 'relative' },
  shelfLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: 1 },
  counterLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  entranceLabel: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  destHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceCol: { alignItems: 'flex-end', gap: 4 },
  discountTag: { paddingHorizontal: 7, paddingVertical: 3 },
  routeHint: { paddingVertical: 10, paddingHorizontal: 12 },
  voiceButton: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  emptyHint: { paddingVertical: 24, alignItems: 'center' },
});
