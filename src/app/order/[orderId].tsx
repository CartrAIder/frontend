import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar } from '@/components/AppBar';
import { BrandRefreshLoader } from '@/components/BrandLoader';
import { useBrandRefresh } from '@/components/BrandRefresh';
import { Card } from '@/components/Card';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { CardListSkeleton } from '@/components/Skeleton';
import { useTheme } from '@/context/ModeContext';
import { fetchPurchaseDetail, type PurchaseDetail } from '@/lib/api';
import { formatDateTimeFull, formatWon } from '@/lib/format';

/** 결제 수단 코드 → 표시 문구. 서버는 토스 응답의 method를 그대로 저장한다. */
const METHOD_LABEL: Record<string, string> = {
  CARD: '카드',
  카드: '카드',
  간편결제: '간편결제',
  계좌이체: '계좌이체',
  가상계좌: '가상계좌',
  휴대폰: '휴대폰',
};

/** 구매 상세 — 주문 상품 내역과 승인된 결제 정보. GET /api/orders/me/{orderId} */
export default function PurchaseDetailScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setError(null);
    try {
      setDetail(await fetchPurchaseDetail(orderId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '주문 상세를 불러오지 못했어요.');
    }
  }, [orderId]);

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

  const totalQty = detail?.items.reduce((sum, it) => sum + it.quantity, 0) ?? 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <AppBar title="구매 상세" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: theme.spacing }}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <BrandRefreshLoader visible={refreshing} />

        {loading && <CardListSkeleton count={3} />}

        {error && !loading && (
          <View style={[styles.errorBox, { borderColor: colors.danger, borderRadius: theme.radiusSm }]}>
            <Text style={{ fontSize: theme.fontBody - 1, color: colors.danger, lineHeight: 20 }}>{error}</Text>
          </View>
        )}

        {detail && !loading && !error && (
          <>
            {/* 주문 요약 */}
            <Card style={{ gap: 10 }}>
              <View style={styles.headRow}>
                <Text style={{ flex: 1, fontSize: theme.fontBody - 3, color: colors.textMuted }}>주문 정보</Text>
                <OrderStatusBadge status={detail.status} />
              </View>
              <MetaRow label="주문번호" value={detail.orderId} />
              <MetaRow label="결제일시" value={formatDateTimeFull(detail.purchasedAt)} />
              <MetaRow label="상품" value={`${detail.items.length}종 · ${totalQty}개`} />
            </Card>

            {/* 주문 상품 */}
            <Card style={{ gap: 8 }}>
              <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>주문 상품</Text>
              {detail.items.map((item, index) => (
                <View key={`${item.productName}-${index}`} style={styles.itemRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>
                      {formatWon(item.unitPrice)} × {item.quantity}
                    </Text>
                  </View>
                  <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>
                    {formatWon(item.lineAmount)}
                  </Text>
                </View>
              ))}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.itemRow}>
                <Text style={{ flex: 1, fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }}>
                  총 결제금액
                </Text>
                <Text style={{ fontSize: theme.fontAmount, color: colors.text, fontWeight: '800' }}>
                  {formatWon(detail.totalAmount)}
                </Text>
              </View>
            </Card>

            {/* 결제 정보 */}
            <Card style={{ gap: 10 }}>
              <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>결제 정보</Text>
              <MetaRow
                label="결제수단"
                value={detail.payment.method ? (METHOD_LABEL[detail.payment.method] ?? detail.payment.method) : '—'}
              />
              <MetaRow
                label="승인금액"
                value={detail.payment.amount != null ? formatWon(detail.payment.amount) : '—'}
              />
              <MetaRow
                label="승인일시"
                value={detail.payment.approvedAt ? formatDateTimeFull(detail.payment.approvedAt) : '—'}
              />
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View style={styles.metaRow}>
      <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>{label}</Text>
      <Text
        style={{ flex: 1, fontSize: theme.fontBody - 1, color: colors.text, fontWeight: '600', textAlign: 'right' }}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  errorBox: { borderWidth: 1, padding: 14 },
});
