import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandRefreshLoader } from '@/components/BrandLoader';
import { useBrandRefresh } from '@/components/BrandRefresh';
import { ProductGridSkeleton } from '@/components/Skeleton';
import { TabTransition } from '@/components/TabTransition';
import { AppBar } from '@/components/AppBar';
import { BottomTabBar, useTabBarPadding } from '@/components/BottomTabBar';
import { Icon } from '@/components/Icon';
import { Chip, EmptyState, ProductCard, SearchBar } from '@/components/commerce';
import { salePrice, useCatalog } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';
import { useProductGrid } from '@/lib/layout';

const GUTTER = 20;

type SortKey = 'recommended' | 'priceAsc' | 'priceDesc' | 'name';

const SORT_LABELS: Record<SortKey, string> = {
  recommended: '추천순',
  priceAsc: '낮은 가격순',
  priceDesc: '높은 가격순',
  name: '이름순',
};

const SORT_ORDER: SortKey[] = ['recommended', 'priceAsc', 'priceDesc', 'name'];

/**
 * 카테고리 · 검색 — 매장 상품을 훑어보는 화면.
 * 홈의 카테고리 칩에서 `?zone=` 으로 넘어오면 해당 구역이 선택된 상태로 열린다.
 */
export default function ProductsScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const params = useLocalSearchParams<{ zone?: string }>();
  const { products, shelfZones, findZone, isRestoring, refresh } = useCatalog();
  const { refreshing, refreshControl } = useBrandRefresh(refresh);
  const bottomPad = useTabBarPadding();

  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string | null>(params.zone ?? null);
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
        // 추천순: 할인 상품 먼저, 품절은 뒤로.
        sorted.sort(
          (a, b) =>
            Number(b.discountPercent ?? 0) - Number(a.discountPercent ?? 0) ||
            Number(a.stock === 0) - Number(b.stock === 0),
        );
    }
    return sorted;
  }, [products, query, zoneFilter, discountOnly, sort, findZone]);

  const { cardWidth: cardW, columns } = useProductGrid(theme.gridColumns, theme.spacing, GUTTER);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <TabTransition>
        <AppBar title="카테고리" onBack={() => router.replace('/home')} />

        {/* 검색 헤더 (고정) */}
        <View
          style={[styles.header, { backgroundColor: colors.background, paddingHorizontal: GUTTER }]}
        >
          <SearchBar value={query} onChangeText={setQuery} placeholder="상품명 · 브랜드로 검색" />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            <Chip label="전체" active={zoneFilter === null} onPress={() => setZoneFilter(null)} />
            {shelfZones.map((zone) => (
              <Chip
                key={zone.id}
                label={zone.label}
                active={zoneFilter === zone.id}
                onPress={() => setZoneFilter(zone.id === zoneFilter ? null : zone.id)}
              />
            ))}
          </ScrollView>

          <View style={styles.toolRow}>
            <Text
              style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, fontWeight: '600' }}
            >
              {results.length}개
            </Text>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => setDiscountOnly((v) => !v)}
              style={styles.toolButton}
              accessibilityLabel={discountOnly ? '할인 상품만 보기 해제' : '할인 상품만 보기'}
            >
              <Icon
                name="tag"
                size={theme.fontBody}
                color={discountOnly ? colors.discount : colors.textMuted}
                filled={discountOnly}
              />
              <Text
                style={{
                  fontSize: theme.fontBody - 3,
                  color: discountOnly ? colors.discount : colors.textMuted,
                  fontWeight: '700',
                }}
              >
                할인만
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setSort(SORT_ORDER[(SORT_ORDER.indexOf(sort) + 1) % SORT_ORDER.length])
              }
              style={styles.toolButton}
              accessibilityLabel={`정렬 ${SORT_LABELS[sort]}, 눌러서 변경`}
            >
              <Icon name="filter" size={theme.fontBody} color={colors.textMuted} />
              <Text style={{ fontSize: theme.fontBody - 3, color: colors.text, fontWeight: '700' }}>
                {SORT_LABELS[sort]}
              </Text>
            </Pressable>
          </View>
        </View>

        {/*
          상품이 50개를 넘어가면 ScrollView + map 은 전부를 한 번에 렌더해서
          탭 전환 중 JS 스레드가 막히고 애니메이션이 끊긴다. FlatList 로 가상화한다.
          numColumns 는 런타임에 못 바꾸므로 모드 전환·창 크기 변화로 열 수가 바뀌면 key 로 다시 마운트한다.
        */}
        <FlatList
          key={`cols-${columns}`}
          data={isRestoring ? [] : results}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? { gap: theme.spacing } : undefined}
          contentContainerStyle={{
            paddingHorizontal: GUTTER,
            paddingBottom: bottomPad,
            paddingTop: 4,
            gap: theme.spacing,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ListHeaderComponent={<BrandRefreshLoader visible={refreshing} />}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          // removeClippedSubviews 는 안드로이드에서 빠르게 스크롤할 때 셀이 빈칸으로
          // 남는 문제가 알려져 있어 쓰지 않는다. 가상화(windowSize)만으로 충분하다.
          renderItem={({ item, index }) => (
            // 첫 화면 카드는 살짝 시차를 두고 올라온다. 스크롤로 새로 들어오는 카드까지
            // 계단식으로 밀리면 답답해지므로 지연은 앞쪽 몇 장으로 제한한다.
            <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 45).duration(260)}>
              <ProductCard
                product={item}
                price={salePrice(item)}
                width={cardW}
                onPress={() => router.push(`/product/${item.id}`)}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            isRestoring ? (
              <ProductGridSkeleton width={cardW} count={6} />
            ) : (
              <EmptyState
                title="찾는 상품이 없어요"
                description={'검색어나 카테고리를 바꿔보세요.\n매장에 없는 상품일 수도 있어요.'}
              />
            )
          }
        />
      </TabTransition>

      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { gap: 10, paddingBottom: 10 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  toolButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
});
