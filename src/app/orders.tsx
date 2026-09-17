import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar } from '@/components/AppBar';
import { BrandRefreshLoader } from '@/components/BrandLoader';
import { useBrandRefresh } from '@/components/BrandRefresh';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { PrimaryButton } from '@/components/PrimaryButton';
import { CardListSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/commerce';
import { useTheme } from '@/context/ModeContext';
import { fetchPurchaseHistory, type PurchaseHistoryItem } from '@/lib/api';
import { formatDateTime, formatWon } from '@/lib/format';

const PAGE_SIZE = 20;

/**
 * 구매 내역 — 결제가 끝난 내 주문만 보여준다(PAID·CANCELED).
 * 결제 대기/만료 주문은 서버 목록에 아예 오지 않으므로 여기서 필터하지 않는다.
 * 페이지는 slice(hasNext) 방식이라 총 건수를 모른다 → "더 보기"로 이어 붙인다.
 */
export default function OrdersScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();

  const [orders, setOrders] = useState<PurchaseHistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 첫 페이지부터 다시 읽는다(진입·당겨서 새로고침). */
  const loadFirst = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchPurchaseHistory({ page: 0, size: PAGE_SIZE });
      setOrders(res.orders);
      setPage(res.page);
      setHasNext(res.hasNext);
    } catch (e) {
      setError(e instanceof Error ? e.message : '구매 내역을 불러오지 못했어요.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadFirst().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadFirst]);

  const { refreshing, refreshControl } = useBrandRefresh(loadFirst);

  async function handleLoadMore() {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    try {
      const next = await fetchPurchaseHistory({ page: page + 1, size: PAGE_SIZE });
      setOrders((prev) => [...prev, ...next.orders]);
      setPage(next.page);
      setHasNext(next.hasNext);
    } catch (e) {
      setError(e instanceof Error ? e.message : '다음 페이지를 불러오지 못했어요.');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <AppBar title="구매 내역" onBack={() => router.replace('/mypage')} />
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: theme.spacing }}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        <BrandRefreshLoader visible={refreshing} />

        {loading && <CardListSkeleton count={4} />}

        {error && !loading && (
          <View style={[styles.errorBox, { borderColor: colors.danger, borderRadius: theme.radiusSm }]}>
            <Text style={{ fontSize: theme.fontBody - 1, color: colors.danger, lineHeight: 20 }}>{error}</Text>
          </View>
        )}

        {!loading && !error && orders.length === 0 && (
          <EmptyState
            title="아직 구매한 내역이 없어요"
            description={'카트로 쇼핑하고 결제하면\n여기에 영수증이 쌓여요'}
            action={
              <View style={{ marginTop: 10, alignSelf: 'stretch', paddingHorizontal: 30 }}>
                <PrimaryButton title="쇼핑 시작하기" variant="neutral" onPress={() => router.replace('/home')} />
              </View>
            }
          />
        )}

        {orders.map((order) => (
          <Pressable
            key={order.orderId}
            onPress={() => router.push({ pathname: '/order/[orderId]', params: { orderId: order.orderId } })}
            accessibilityRole="button"
            accessibilityLabel={`${order.orderName} 상세 보기`}
          >
            <Card style={{ gap: 8 }}>
              <View style={styles.cardHead}>
                <Text
                  style={{ flex: 1, fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}
                  numberOfLines={1}
                >
                  {order.orderName}
                </Text>
                <OrderStatusBadge status={order.status} />
              </View>
              <View style={styles.cardFoot}>
                <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>
                  {formatDateTime(order.purchasedAt)}
                </Text>
                <View style={{ flex: 1 }} />
                <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }}>
                  {formatWon(order.totalAmount)}
                </Text>
                <Icon name="chevronRight" size={16} color={colors.textMuted} />
              </View>
            </Card>
          </Pressable>
        ))}

        {!loading && hasNext && (
          <Pressable
            onPress={handleLoadMore}
            disabled={loadingMore}
            style={[
              styles.moreButton,
              { borderColor: colors.border, borderRadius: theme.radiusSm, minHeight: theme.minTouch },
            ]}
          >
            <Text style={{ fontSize: theme.fontBody - 1, color: colors.text, fontWeight: '700' }}>
              {loadingMore ? '불러오는 중…' : '더 보기'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorBox: { borderWidth: 1, padding: 14 },
  moreButton: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
