import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ModeContext';
import { findProduct } from '@/lib/mock/products';

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

/** (2) 장바구니 화면 — mock SSE로 상품이 실시간으로 담기고, 수량 조절·삭제가 가능하다. */
export default function CartScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { cartId } = useAuth();
  const cart = useCart();
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    if (!cart.lastScanned) return undefined;
    setBannerVisible(true);
    const timer = setTimeout(() => setBannerVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [cart.lastScanned]);

  const statusText =
    cart.connectionStatus === 'open'
      ? `카트 #${cartId} 연결됨 — 실시간 인식 중`
      : cart.connectionStatus === 'connecting'
        ? '카트 연결 중...'
        : '카트 미연결';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: colors.successSurface, padding: theme.spacing / 1.5 },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.text }}>{statusText}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/navigate')}
          style={[
            styles.mapButton,
            { borderColor: colors.border, minHeight: theme.minTouch },
          ]}
          accessibilityLabel="매장 길 안내 열기"
        >
          <Text style={{ fontSize: theme.fontBody - 3, color: colors.primary }}>🧭 매장 안내</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ gap: theme.spacing, paddingVertical: theme.spacing }}
      >
        {cart.items.length === 0 ? (
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center' }}>
            상품을 스캔하면 여기에 실시간으로 담겨요
          </Text>
        ) : (
          cart.items.map((item) => {
            const icon = findProduct(item.id)?.icon ?? '🛒';
            return (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  { borderColor: colors.border, padding: theme.spacing, minHeight: theme.minTouch },
                ]}
              >
                <Text style={styles.itemIcon}>{icon}</Text>
                <View style={styles.itemInfo}>
                  <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>
                    {formatWon(item.unitPrice)} / 개
                  </Text>
                </View>
                <View style={styles.qtyStepper}>
                  <Pressable
                    onPress={() => cart.decreaseQty(item.id)}
                    style={[
                      styles.stepperButton,
                      { borderColor: colors.border, minHeight: theme.minTouch, minWidth: theme.minTouch },
                    ]}
                    accessibilityLabel={`${item.name} 수량 줄이기`}
                  >
                    <Text style={{ fontSize: theme.fontButton, color: colors.text }}>−</Text>
                  </Pressable>
                  <Text style={{ fontSize: theme.fontBody, color: colors.text, minWidth: 24, textAlign: 'center' }}>
                    {item.qty}
                  </Text>
                  <Pressable
                    onPress={() => cart.increaseQty(item.id)}
                    style={[
                      styles.stepperButton,
                      { borderColor: colors.border, minHeight: theme.minTouch, minWidth: theme.minTouch },
                    ]}
                    accessibilityLabel={`${item.name} 수량 늘리기`}
                  >
                    <Text style={{ fontSize: theme.fontButton, color: colors.text }}>+</Text>
                  </Pressable>
                </View>
                <Text
                  style={{
                    fontSize: theme.fontBody,
                    color: colors.text,
                    fontWeight: '700',
                    minWidth: 72,
                    textAlign: 'right',
                  }}
                >
                  {formatWon(item.unitPrice * item.qty)}
                </Text>
              </View>
            );
          })
        )}

        {bannerVisible && cart.lastScanned && (
          <View
            style={[
              styles.banner,
              { borderColor: colors.primary, backgroundColor: colors.surface, padding: theme.spacing },
            ]}
          >
            <Text style={{ fontSize: theme.fontBody - 2, color: colors.primary, fontWeight: '600' }}>
              방금 추가됨: {cart.lastScanned.name} × {cart.lastScanned.qty}{' '}
              {formatWon(cart.lastScanned.lineTotal)}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, gap: theme.spacing / 2 }]}>
        <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>
          상품 {cart.itemCount}종 {cart.totalQty}개
        </Text>
        <View
          style={[
            styles.totalBox,
            { backgroundColor: colors.successSurface, padding: theme.spacing },
          ]}
        >
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.text }}>총 결제 예정 금액</Text>
          <Text style={{ fontSize: theme.fontAmount, color: colors.text, fontWeight: '700' }}>
            {formatWon(cart.total)}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/checkout')}
          disabled={cart.items.length === 0}
          style={[
            styles.payButton,
            {
              backgroundColor: cart.items.length === 0 ? colors.border : colors.success,
              minHeight: theme.minTouch,
            },
          ]}
        >
          <Text style={{ fontSize: theme.fontButton, color: colors.primaryText, fontWeight: '700' }}>
            결제하기 →
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  statusBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  mapButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  itemIcon: { fontSize: 28 },
  itemInfo: { flex: 1, gap: 2 },
  qtyStepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperButton: {
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: { borderWidth: 1, borderRadius: 12 },
  footer: { borderTopWidth: 1, paddingVertical: 12, paddingBottom: 16 },
  totalBox: { borderRadius: 12, gap: 2 },
  payButton: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
