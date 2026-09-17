import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardListSkeleton } from '@/components/Skeleton';
import { Icon } from '@/components/Icon';
import { AppBar } from '@/components/AppBar';
import { BrandRefreshLoader } from '@/components/BrandLoader';
import { useBrandRefresh } from '@/components/BrandRefresh';
import { Card } from '@/components/Card';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { useTheme } from '@/context/ModeContext';
import { adminSearchOrders, ORDER_STATUS_LABEL, type AdminOrderPage, type ApiOrderStatus } from '@/lib/api';
import { formatDateTime, formatWon } from '@/lib/format';

const PAGE_SIZE = 20;

/** 상태 필터 칩 — null은 "전체". */
const STATUS_FILTERS: { key: string; value: ApiOrderStatus | null; label: string }[] = [
  { key: 'all', value: null, label: '전체' },
  { key: 'paid', value: 'PAID', label: ORDER_STATUS_LABEL.PAID },
  { key: 'pending', value: 'PENDING_PAYMENT', label: ORDER_STATUS_LABEL.PENDING_PAYMENT },
  { key: 'canceled', value: 'CANCELED', label: ORDER_STATUS_LABEL.CANCELED },
  { key: 'expired', value: 'EXPIRED', label: ORDER_STATUS_LABEL.EXPIRED },
];

/** 관리자 주문 관리 — 검색·상태 필터·페이지 이동. 조회 전용(서버에 변경 API가 아직 없다). */
export default function AdminOrdersScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();

  const [keywordInput, setKeywordInput] = useState('');
  /** 실제 조회에 쓰는 검색어 — 입력 중 매번 요청하지 않도록 제출 시점에만 반영한다. */
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ApiOrderStatus | null>(null);
  const [page, setPage] = useState(0);

  const [data, setData] = useState<AdminOrderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await adminSearchOrders({ keyword, status, page, size: PAGE_SIZE }));
    } catch (e) {
      setError(e instanceof Error ? e.message : '주문을 불러오지 못했어요.');
    }
  }, [keyword, status, page]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const { refreshing, refreshControl } = useBrandRefresh(load);

  /** 검색어·필터가 바뀌면 첫 페이지로 되돌린다(빈 페이지를 보게 되는 것 방지). */
  function applyKeyword() {
    setPage(0);
    setKeyword(keywordInput.trim());
  }

  function applyStatus(next: ApiOrderStatus | null) {
    setPage(0);
    setStatus(next);
  }

  const orders = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <AppBar title="주문 관리" />
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: theme.spacing }}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        <BrandRefreshLoader visible={refreshing} />

        {/* 검색 */}
        <View
          style={[
            styles.searchRow,
            { backgroundColor: colors.surface, borderRadius: theme.radiusSm, minHeight: theme.minTouch },
          ]}
        >
          <Icon name="search" size={theme.fontBody + 2} color={colors.textMuted} />
          <TextInput
            value={keywordInput}
            onChangeText={setKeywordInput}
            onSubmitEditing={applyKeyword}
            returnKeyType="search"
            placeholder="주문번호·주문명·고객 이름/이메일"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ flex: 1, fontSize: theme.fontBody, color: colors.text, paddingVertical: 12 }}
          />
          {keywordInput.length > 0 && (
            <Pressable
              onPress={() => {
                setKeywordInput('');
                setPage(0);
                setKeyword('');
              }}
              hitSlop={8}
            >
              <Icon name="close" size={theme.fontBody + 2} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* 상태 필터 */}
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((f) => {
            const selected = status === f.value;
            return (
              <Pressable
                key={f.key}
                onPress={() => applyStatus(f.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderRadius: theme.radiusSm,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: theme.fontBody - 3,
                    color: selected ? colors.primaryText : colors.textMuted,
                    fontWeight: '700',
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!loading && !error && (
          <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted, marginLeft: 4 }}>
            총 {data?.totalElements ?? 0}건
            {totalPages > 1 ? ` · ${page + 1}/${totalPages} 페이지` : ''}
          </Text>
        )}

        {loading && <CardListSkeleton count={4} />}

        {error && !loading && (
          <View style={[styles.errorBox, { borderColor: colors.danger }]}>
            <Text style={{ fontSize: theme.fontBody - 1, color: colors.danger, lineHeight: 20 }}>{error}</Text>
          </View>
        )}

        {!loading &&
          !error &&
          orders.map((order) => (
            <Pressable
              key={order.orderId}
              onPress={() => router.push(`/admin/order/${encodeURIComponent(order.orderId)}`)}
              accessibilityRole="button"
            >
              <Card style={{ gap: 10 }}>
                <View style={styles.head}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text
                      style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }}
                      numberOfLines={1}
                    >
                      {order.orderName}
                    </Text>
                    <Text style={{ fontSize: theme.fontBody - 5, color: colors.textMuted }} numberOfLines={1}>
                      {order.orderId}
                    </Text>
                  </View>
                  <OrderStatusBadge status={order.status} />
                </View>

                <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: theme.fontBody - 3, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                      {order.userName}
                    </Text>
                    <Text style={{ fontSize: theme.fontBody - 5, color: colors.textMuted }} numberOfLines={1}>
                      {order.userEmail} · {formatDateTime(order.createdAt)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: theme.fontAmount - 2, color: colors.text, fontWeight: '800' }}>
                    {formatWon(order.totalAmount)}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}

        {!loading && !error && orders.length === 0 && (
          <View style={styles.stateBox}>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>
              {keyword || status ? '조건에 맞는 주문이 없어요.' : '아직 주문이 없어요.'}
            </Text>
          </View>
        )}

        {/* 페이지 이동 */}
        {!loading && !error && totalPages > 1 && (
          <View style={styles.pagerRow}>
            <PagerButton label="‹ 이전" disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))} />
            <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, fontWeight: '700' }}>
              {page + 1} / {totalPages}
            </Text>
            <PagerButton
              label="다음 ›"
              disabled={page >= totalPages - 1}
              onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PagerButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.pagerButton,
        {
          borderColor: colors.border,
          borderRadius: theme.radiusSm,
          minHeight: theme.minTouch - 6,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Text style={{ fontSize: theme.fontBody - 1, color: colors.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderTopWidth: 1, paddingTop: 10 },
  stateBox: { paddingVertical: 40, alignItems: 'center' },
  errorBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 },
  pagerButton: { borderWidth: 1.5, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
});
