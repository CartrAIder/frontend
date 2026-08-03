import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TossPaymentModal, type TossFail, type TossSuccess } from '@/components/TossPaymentModal';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ModeContext';
import {
  confirmPayment,
  createOrder,
  createPaymentAttempt,
  fetchProducts,
  getTossClientKey,
  type OrderDraft,
  type PaymentAttempt,
} from '@/lib/api';

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

/** 영수증에 찍을 주문 상품 한 줄. */
interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
}

/** 결제창에 넘길 세션 정보 — 주문·결제시도·클라이언트키·영수증 항목을 한데 묶는다. */
interface TossSession {
  clientKey: string;
  order: OrderDraft;
  attempt: PaymentAttempt;
  orderItems: ReceiptItem[];
}

/** (3) 결제 확인 화면 — 주문을 생성하고 토스 결제창을 띄운 뒤 승인까지 처리한다. */
export default function CheckoutScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const cart = useCart();
  const { member } = useAuth();

  const [preparing, setPreparing] = useState(false); // 주문 생성~결제창 오픈 준비 중
  const [confirming, setConfirming] = useState(false); // 토스 승인 처리 중
  const [error, setError] = useState<string | null>(null);
  const [toss, setToss] = useState<TossSession | null>(null); // 값이 있으면 결제창 표시

  const busy = preparing || confirming;

  /** 결제하기 — 장바구니를 주문으로 만들고 결제 시도를 생성한 뒤 토스 결제창을 연다. */
  async function handlePay() {
    if (busy || cart.items.length === 0) return;
    setPreparing(true);
    setError(null);
    try {
      // 장바구니 아이템(바코드) → 백엔드 상품 id 로 변환
      const products = await fetchProducts();
      const idByBarcode = new Map(products.map((p) => [p.barcode, p.id]));
      const items: { productId: number; quantity: number }[] = [];
      for (const item of cart.items) {
        const productId = idByBarcode.get(item.id);
        if (productId == null) {
          throw new Error(`상품 정보를 찾을 수 없어요: ${item.name}`);
        }
        items.push({ productId, quantity: item.qty });
      }

      // 영수증에 찍을 상품 목록(이름·수량·단가)을 결제 전에 캡처한다(결제 후 카트는 비워짐).
      const orderItems: ReceiptItem[] = cart.items.map((it) => ({
        name: it.name,
        qty: it.qty,
        unitPrice: it.unitPrice,
      }));

      const order = await createOrder(items);
      const attempt = await createPaymentAttempt(order.orderId);
      const clientKey = await getTossClientKey();
      setToss({ clientKey, order, attempt, orderItems });
    } catch (e) {
      setError(e instanceof Error ? e.message : '결제 준비에 실패했어요. 다시 시도해주세요.');
    } finally {
      setPreparing(false);
    }
  }

  /** 토스 결제 성공 → 서버 승인 → 완료 화면. */
  async function handleTossSuccess(result: TossSuccess) {
    if (!toss) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await confirmPayment({
        paymentKey: result.paymentKey,
        orderId: toss.order.orderId,
        amount: toss.order.totalAmount,
        paymentAttemptId: toss.attempt.paymentAttemptId,
      });
      if (res.status !== 'APPROVED') {
        throw new Error(res.message || '결제 승인에 실패했어요.');
      }
      setToss(null);
      router.replace({
        pathname: '/complete',
        params: {
          receiptId: toss.order.orderId,
          amount: String(toss.order.totalAmount),
          orderName: toss.order.orderName,
          items: JSON.stringify(toss.orderItems),
          paidAt: String(Date.now()),
        },
      });
    } catch (e) {
      setToss(null);
      setError(e instanceof Error ? e.message : '결제 승인에 실패했어요. 다시 시도해주세요.');
    } finally {
      setConfirming(false);
    }
  }

  /** 토스 결제 실패/취소. 사용자가 닫은 경우(USER_CANCEL)는 조용히 닫는다. */
  function handleTossFail(fail: TossFail) {
    setToss(null);
    if (fail.code !== 'USER_CANCEL' && fail.code !== 'PAY_PROCESS_CANCELED') {
      setError(fail.message);
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
            결제하기를 누르면 토스 결제창에서 카드 정보를 입력해요
          </Text>
        </View>
        <PrimaryButton
          title={confirming ? '결제 확인 중…' : `${formatWon(cart.total)} 결제하기`}
          onPress={handlePay}
          loading={busy}
          disabled={cart.items.length === 0}
          variant="success"
        />
        <Pressable
          onPress={() => router.back()}
          disabled={busy}
          style={[styles.cancelButton, { minHeight: theme.minTouch, justifyContent: 'center' }]}
          hitSlop={8}
        >
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center' }}>취소</Text>
        </Pressable>
      </View>

      {toss && (
        <TossPaymentModal
          visible
          clientKey={toss.clientKey}
          orderId={toss.order.orderId}
          orderName={toss.order.orderName}
          amount={toss.order.totalAmount}
          customerName={member?.name}
          onSuccess={handleTossSuccess}
          onFail={handleTossFail}
          onCancel={() => setToss(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, gap: 12 },
  divider: { height: 1, marginVertical: 6 },
  totalBox: { gap: 4 },
  tipBanner: { paddingVertical: 10, paddingHorizontal: 12 },
  cancelButton: { paddingVertical: 10 },
});
