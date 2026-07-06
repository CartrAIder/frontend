import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ModeContext';
import { requestPayment } from '@/lib/api';

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

const PAYMENT_METHODS = ['카카오페이', '신용카드'];

/** (3) 결제 확인 화면 — 주문 요약을 보여주고 1탭으로 결제(mock)를 확정한다. */
export default function CheckoutScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { cartId } = useAuth();
  const cart = useCart();

  const [methodIndex, setMethodIndex] = useState(0);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.text }]}>
        결제 확인
      </Text>

      <ScrollView contentContainerStyle={{ gap: theme.spacing }}>
        <View style={[styles.card, { borderColor: colors.border, padding: theme.spacing }]}>
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, marginBottom: 4 }}>
            주문 내역
          </Text>
          {cart.items.map((item) => (
            <View key={item.id} style={styles.orderRow}>
              <Text style={{ fontSize: theme.fontBody, color: colors.text }}>
                {item.name} × {item.qty}
              </Text>
              <Text style={{ fontSize: theme.fontBody, color: colors.text }}>
                {formatWon(item.unitPrice * item.qty)}
              </Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.orderRow}>
            <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>
              합계
            </Text>
            <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>
              {formatWon(cart.total)}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setMethodIndex((i) => (i + 1) % PAYMENT_METHODS.length)}
          style={[styles.card, styles.orderRow, { borderColor: colors.border, padding: theme.spacing }]}
        >
          <View>
            <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>결제 수단</Text>
            <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }}>
              {PAYMENT_METHODS[methodIndex]}
            </Text>
          </View>
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.primary }}>변경</Text>
        </Pressable>

        <View
          style={[
            styles.totalBox,
            { backgroundColor: colors.successSurface, padding: theme.spacing },
          ]}
        >
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.text }}>최종 결제 금액</Text>
          <Text style={{ fontSize: theme.fontAmount, color: colors.text, fontWeight: '700' }}>
            {formatWon(cart.total)}
          </Text>
        </View>

        {error && (
          <Text style={{ fontSize: theme.fontBody, color: colors.warningText, textAlign: 'center' }}>
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={{ gap: theme.spacing / 2 }}>
        <Pressable
          onPress={handleConfirm}
          disabled={paying || cart.items.length === 0}
          style={[
            styles.confirmButton,
            { backgroundColor: colors.success, minHeight: theme.minTouch },
          ]}
        >
          {paying ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={{ fontSize: theme.fontButton, color: colors.primaryText, fontWeight: '700' }}>
              결제 확인
            </Text>
          )}
        </Pressable>
        <Pressable onPress={() => router.back()} disabled={paying} style={styles.cancelButton}>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center' }}>
            취소
          </Text>
        </Pressable>
        <View
          style={[
            styles.tipBanner,
            { backgroundColor: colors.warningSurface, padding: theme.spacing / 1.5 },
          ]}
        >
          <Text style={{ fontSize: theme.fontBody - 3, color: colors.warningText, textAlign: 'center' }}>
            결제는 2번만 누르면 완료돼요{'\n'}(장바구니 결제하기 → 결제 확인)
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  title: { fontWeight: '700', textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: 12 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  divider: { height: 1, marginVertical: 8 },
  totalBox: { borderRadius: 12, gap: 2 },
  confirmButton: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { paddingVertical: 8 },
  tipBanner: { borderRadius: 10 },
});
