import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useCartSession } from '@/context/CartSessionContext';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ModeContext';
import { requestPayment } from '@/lib/api';

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

const PAYMENT_METHODS = [
  { name: '카카오페이', icon: '💛' },
  { name: '신용카드', icon: '💳' },
];

/** (3) 결제 확인 화면 — 주문 요약을 보여주고 1탭으로 결제(mock)를 확정한다. */
export default function CheckoutScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { cartId } = useCartSession();
  const cart = useCart();

  const [methodIndex, setMethodIndex] = useState(0);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const method = PAYMENT_METHODS[methodIndex];

  async function handleConfirm() {
    if (paying) return;
    setPaying(true);
    setError(null);
    try {
      const result = await requestPayment(cartId ?? 'UNKNOWN', cart.total);
      router.replace({
        pathname: '/complete',
        params: { receiptId: result.receiptId, amount: String(cart.total) },
      });
    } catch {
      setError('결제에 실패했어요. 다시 시도해주세요.');
      setPaying(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing, paddingVertical: theme.spacing }}>
        <Card style={{ gap: 8 }}>
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, fontWeight: '600' }}>주문 내역</Text>
          {cart.items.map((item) => (
            <View key={item.id} style={styles.orderRow}>
              <Text style={{ fontSize: theme.fontBody, color: colors.text }} numberOfLines={1}>
                {item.name} <Text style={{ color: colors.textMuted }}>× {item.qty}</Text>
              </Text>
              <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }}>
                {formatWon(item.unitPrice * item.qty)}
              </Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.orderRow}>
            <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>상품 합계</Text>
            <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>{formatWon(cart.total)}</Text>
          </View>
        </Card>

        <Pressable onPress={() => setMethodIndex((i) => (i + 1) % PAYMENT_METHODS.length)}>
          <Card style={styles.methodRow}>
            <View style={[styles.methodIcon, { backgroundColor: colors.surface, borderRadius: theme.radiusSm }]}>
              <Text style={{ fontSize: 22 }}>{method.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>결제 수단</Text>
              <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>{method.name}</Text>
            </View>
            <View style={[styles.changeChip, { backgroundColor: colors.primarySurface, borderRadius: theme.radiusSm }]}>
              <Text style={{ fontSize: theme.fontBody - 3, color: colors.primary, fontWeight: '700' }}>변경</Text>
            </View>
          </Card>
        </Pressable>

        <View style={[styles.totalBox, { backgroundColor: colors.successSurface, borderRadius: theme.radius, padding: theme.spacing + 4 }]}>
          <Text style={{ fontSize: theme.fontBody - 1, color: colors.text }}>최종 결제 금액</Text>
          <Text style={{ fontSize: theme.fontDisplay, color: colors.text, fontWeight: '800' }}>{formatWon(cart.total)}</Text>
        </View>

        {error && (
          <Text style={{ fontSize: theme.fontBody, color: colors.danger, textAlign: 'center' }}>{error}</Text>
        )}
      </ScrollView>

      <View style={{ gap: theme.spacing / 2, paddingBottom: 8 }}>
        <View style={[styles.tipBanner, { backgroundColor: colors.warningSurface, borderRadius: theme.radiusSm }]}>
          <Text style={{ fontSize: theme.fontBody - 3, color: colors.warningText, textAlign: 'center' }}>
            결제는 2번만 누르면 완료돼요 (결제하기 → 결제 확인)
          </Text>
        </View>
        <PrimaryButton
          title={`${formatWon(cart.total)} 결제하기`}
          onPress={handleConfirm}
          loading={paying}
          disabled={cart.items.length === 0}
          variant="success"
        />
        <Pressable onPress={() => router.back()} disabled={paying} style={styles.cancelButton} hitSlop={8}>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center' }}>취소</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, gap: 12 },
  divider: { height: 1, marginVertical: 6 },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  changeChip: { paddingHorizontal: 12, paddingVertical: 7 },
  totalBox: { gap: 4 },
  tipBanner: { paddingVertical: 10, paddingHorizontal: 12 },
  cancelButton: { paddingVertical: 10 },
});
