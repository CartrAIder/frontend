import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { useCatalog, salePrice } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';
import type { Product } from '@/lib/mock/products';

type SortKey = 'recommended' | 'priceAsc' | 'priceDesc' | 'name';

const SORT_LABELS: Record<SortKey, string> = {
  recommended: '추천순',
  priceAsc: '낮은 가격순',
  priceDesc: '높은 가격순',
  name: '이름순',
};

/**
 * 상품 보기 — "이 매장에서 이런 걸 팝니다" 검색 화면.
 * 검색어·구역(카테고리)·정렬·할인만 보기로 좁혀 보고, 탭하면 상세로 들어간다.
 */
export default function ProductsScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { products, shelfZones, findZone } = useCatalog();

  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('recommended');
  const [discountOnly, setDiscountOnly] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (zoneFilter && p.zone !== zoneFilter) return false;
      if (discountOnly && !p.discountPercent) return false;
      if (!q) return true;
      const zoneLabel = findZone(p.zone)?.label ?? '';
      return (
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q) ||
        zoneLabel.toLowerCase().includes(q)
      );
    });

    const sorted = [...filtered];
    switch (sort) {
      case 'priceAsc':
        sorted.sort((a, b) => salePrice(a) - salePrice(b));
        break;
      case 'priceDesc':
        sorted.sort((a, b) => salePrice(b) - salePrice(a));
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
        break;
      default:
        // 추천순: 할인 상품 먼저, 그다음 품절 상품을 뒤로.
        sorted.sort(
          (a, b) =>
            Number(b.discountPercent ?? 0) - Number(a.discountPercent ?? 0) ||
            Number(a.stock === 0) - Number(b.stock === 0),
        );
    }
    return sorted;
  }, [products, query, zoneFilter, discountOnly, sort, findZone]);

  const chips = [{ id: null as string | null, label: '전체', icon: '🧺' }, ...shelfZones.map((z) => ({ id: z.id, label: z.label, icon: z.icon }))];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: theme.spacing }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 검색창 */}
        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderRadius: theme.radiusSm, minHeight: theme.minTouch }]}>
          <Text style={{ fontSize: theme.fontBody }}>🔎</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="상품명·브랜드로 검색"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, fontSize: theme.fontBody, color: colors.text, paddingVertical: 12 }}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="검색어 지우기">
              <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* 카테고리(구역) 칩 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {chips.map((chip) => {
            const active = zoneFilter === chip.id;
            return (
              <Pressable
                key={chip.id ?? 'all'}
                onPress={() => setZoneFilter(chip.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: 999,
                    minHeight: theme.minTouch - 8,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: theme.fontBody - 2,
                    color: active ? colors.primaryText : colors.text,
                    fontWeight: '700',
                  }}
                >
                  {chip.icon} {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 정렬 · 필터 */}
        <View style={styles.toolRow}>
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, fontWeight: '600' }}>
            {results.length}개 상품
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => setDiscountOnly((v) => !v)}
            style={[
              styles.toolButton,
              {
                backgroundColor: discountOnly ? colors.warningSurface : colors.card,
                borderColor: discountOnly ? colors.warningText : colors.border,
                borderRadius: theme.radiusSm,
              },
            ]}
          >
            <Text
              style={{
                fontSize: theme.fontBody - 3,
                color: discountOnly ? colors.warningText : colors.textMuted,
                fontWeight: '700',
              }}
            >
              🏷️ 할인만
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const order: SortKey[] = ['recommended', 'priceAsc', 'priceDesc', 'name'];
              setSort(order[(order.indexOf(sort) + 1) % order.length]);
            }}
            style={[styles.toolButton, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: theme.radiusSm }]}
            accessibilityLabel={`정렬 ${SORT_LABELS[sort]}, 눌러서 변경`}
          >
            <Text style={{ fontSize: theme.fontBody - 3, color: colors.text, fontWeight: '700' }}>
              ⇅ {SORT_LABELS[sort]}
            </Text>
          </Pressable>
        </View>

        {/* 결과 목록 */}
        {results.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>🗂️</Text>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center' }}>
              조건에 맞는 상품이 없어요.{'\n'}검색어나 카테고리를 바꿔보세요.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {results.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                zoneLabel={findZone(product.zone)?.label ?? '미지정'}
                onPress={() => router.push(`/product/${product.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** 검색 결과 한 줄 — 아이콘·이름·구역·가격(할인 시 정가 취소선)·품절 배지. */
function ProductRow({
  product,
  zoneLabel,
  onPress,
}: {
  product: Product;
  zoneLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const soldOut = product.stock === 0;
  const price = salePrice(product);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${product.name} 상세 보기`}>
      <Card style={[styles.row, { opacity: soldOut ? 0.6 : 1 }]}>
        <View style={[styles.thumb, { backgroundColor: colors.surface, borderRadius: theme.radiusSm }]}>
          <Text style={{ fontSize: 28 }}>{product.icon}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.nameRow}>
            <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }} numberOfLines={1}>
              {product.name}
            </Text>
            {soldOut && (
              <View style={[styles.tag, { backgroundColor: colors.border, borderRadius: 6 }]}>
                <Text style={{ fontSize: theme.fontBody - 5, color: colors.textMuted, fontWeight: '800' }}>품절</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }} numberOfLines={1}>
            {product.brand ? `${product.brand} · ` : ''}
            {zoneLabel} 구역
          </Text>
          <View style={styles.priceRow}>
            {product.discountPercent ? (
              <>
                <View style={[styles.tag, { backgroundColor: colors.warningSurface, borderRadius: 6 }]}>
                  <Text style={{ fontSize: theme.fontBody - 5, color: colors.warningText, fontWeight: '800' }}>
                    {product.discountPercent}%
                  </Text>
                </View>
                <Text
                  style={{ fontSize: theme.fontBody - 4, color: colors.textMuted, textDecorationLine: 'line-through' }}
                >
                  ₩{product.unitPrice.toLocaleString('ko-KR')}
                </Text>
              </>
            ) : null}
            <Text style={{ fontSize: theme.fontBody + 1, color: colors.text, fontWeight: '800' }}>
              ₩{price.toLocaleString('ko-KR')}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>›</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  chip: { paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1.5 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolButton: { borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 6, paddingVertical: 2 },
  empty: { paddingVertical: 48, alignItems: 'center', gap: 10 },
});
