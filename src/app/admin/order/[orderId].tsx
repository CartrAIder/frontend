import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar } from '@/components/AppBar';
import { Card } from '@/components/Card';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { ProductImage } from '@/components/ProductImage';
import { useTheme } from '@/context/ModeContext';
import { adminGetOrder, type AdminOrderDetail } from '@/lib/api';
import { formatDateTimeFull, formatWon } from '@/lib/format';

/** 관리자 주문 상세 — 주문 요약·고객 정보·주문 상품 내역. 조회 전용. */
export default function AdminOrderDetailScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) {
      setError('주문번호가 없어요.');
      return;
    }
    setError(null);
    try {
      setOrder(await adminGetOrder(orderId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '주문을 불러오지 못했어요.');
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

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <AppBar title="주문 상세" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <AppBar title="주문 상세" />
        <View style={styles.center}>
          <Text style={{ fontSize: theme.fontBody, color: colors.danger, textAlign: 'center' }}>
            {error ?? '주문을 찾을 수 없어요.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 상품 금액 합계 — 주문 총액과 다르면(할인·정정 등) 아래에서 따로 표시한다.
  const itemsTotal = order.items.reduce((sum, item) => sum + item.lineAmount, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <AppBar title="주문 상세" subtitle={order.orderId} />
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: theme.spacing }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* 주문 요약 */}
        <Card style={{ gap: 12 }}>
          <View style={styles.head}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }}>
                {order.orderName}
              </Text>
              <Text style={{ fontSize: theme.fontBody - 5, color: colors.textMuted }}>{order.orderId}</Text>
            </View>
            <OrderStatusBadge status={order.status} />
          </View>

          <View style={[styles.amountRow, { borderTopColor: colors.border }]}>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, fontWeight: '700' }}>결제 금액</Text>
            <Text style={{ fontSize: theme.fontAmount, color: colors.text, fontWeight: '800' }}>
              {formatWon(order.totalAmount)}
            </Text>
          </View>
        </Card>

        {/* 고객 */}
        <Section title="고객">
          <InfoRow label="이름" value={order.customer.name} />
          <InfoRow label="이메일" value={order.customer.email} />
          <InfoRow label="회원번호" value={`#${order.customer.id}`} />
        </Section>

        {/* 주문 상품 */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, fontWeight: '700', marginLeft: 4 }}>
            주문 상품 {order.items.length}건
          </Text>
          <Card padded={false}>
            {order.items.map((item, index) => (
              <View key={item.id}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <View style={[styles.itemRow, { padding: theme.spacing + 2 }]}>
                  <ProductImage
                    id={String(item.productId)}
                    name={item.productName}
                    size={52}
                    radius={theme.imageRadius}
                  />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text
                      style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}
                      numberOfLines={2}
                    >
                      {item.productName}
                    </Text>
                    <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>
                      {formatWon(item.unitPrice)} × {item.quantity}
                    </Text>
                  </View>
                  <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }}>
                    {formatWon(item.lineAmount)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
          {itemsTotal !== order.totalAmount && (
            <Text style={{ fontSize: theme.fontBody - 4, color: colors.warningText, marginLeft: 4 }}>
              상품 합계({formatWon(itemsTotal)})와 주문 총액이 달라요.
            </Text>
          )}
        </View>

        {/* 이력 */}
        <Section title="이력">
          <InfoRow label="주문 생성" value={formatDateTimeFull(order.createdAt)} />
          <InfoRow label="최종 변경" value={formatDateTimeFull(order.updatedAt)} />
        </Section>

        <Text style={{ fontSize: theme.fontBody - 5, color: colors.textMuted, textAlign: 'center' }}>
          결제 수단·승인 정보는 백엔드 결제 조회 API가 준비되면 표시됩니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, fontWeight: '700', marginLeft: 4 }}>
        {title}
      </Text>
      <Card style={{ gap: 10 }}>{children}</Card>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View style={styles.infoRow}>
      <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, fontWeight: '600' }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: theme.fontBody - 2, color: colors.text, textAlign: 'right' }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { height: 1, marginHorizontal: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
});
