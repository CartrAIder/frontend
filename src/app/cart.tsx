import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useCartSession } from '@/context/CartSessionContext';
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
  const { cartId, endSession } = useCartSession();
  const cart = useCart();
  const [bannerVisible, setBannerVisible] = useState(false);

  function handleReturnCart() {
    Alert.alert('카트 반납', '담긴 상품이 모두 사라지고 카트 연결이 해제돼요. 반납할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '반납',
        style: 'destructive',
        onPress: () => {
          endSession(); // 서버 점유 해제 + 로컬 세션/장바구니 정리(캐스케이드)
          router.replace('/home');
        },
      },
    ]);
  }

  useEffect(() => {
    if (!cart.lastScanned) return undefined;
    setBannerVisible(true);
    const timer = setTimeout(() => setBannerVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [cart.lastScanned]);

  const isLive = cart.connectionStatus === 'open';
  const statusText = isLive
    ? `카트 #${cartId} · 실시간 인식 중`
    : cart.connectionStatus === 'connecting'
      ? '카트 연결 중...'
      : '카트 미연결';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={styles.headerRow}>
        <View style={[styles.statusPill, { backgroundColor: isLive ? colors.successSurface : colors.surface }]}>
          <View style={[styles.statusDot, { backgroundColor: isLive ? colors.success : colors.textMuted }]} />
          <Text style={{ fontSize: theme.fontBody - 3, color: colors.text, fontWeight: '600' }}>{statusText}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/navigate')}
          style={[styles.mapButton, { backgroundColor: colors.primarySurface, minHeight: theme.minTouch, borderRadius: theme.radiusSm }]}
          accessibilityLabel="매장 길 안내 열기"
        >
          <Text style={{ fontSize: theme.fontBody - 3, color: colors.primary, fontWeight: '700' }}>🧭 매장 안내</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ gap: theme.spacing, paddingVertical: theme.spacing }}>
        {cart.items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center', lineHeight: 24 }}>
              상품을 카트에 담으면{'\n'}여기에 실시간으로 나타나요
            </Text>
          </View>
        ) : (
          cart.items.map((item) => {
            const icon = findProduct(item.id)?.icon ?? '🛒';
            return (
              <Card key={item.id} padded={false} style={[styles.itemCard, { padding: theme.spacing }]}>
                <View style={[styles.iconTile, { backgroundColor: colors.surface, borderRadius: theme.radiusSm }]}>
                  <Text style={styles.itemIcon}>{icon}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>
                    {formatWon(item.unitPrice)} / 개
                  </Text>
                  <Text style={{ fontSize: theme.fontBody - 1, color: colors.text, fontWeight: '800', marginTop: 2 }}>
                    {formatWon(item.unitPrice * item.qty)}
                  </Text>
                </View>
                <View style={[styles.stepper, { backgroundColor: colors.surface, borderRadius: 999 }]}>
                  <Pressable
                    onPress={() => cart.decreaseQty(item.id)}
                    style={[styles.stepBtn, { minHeight: theme.minTouch - 8, minWidth: theme.minTouch - 8 }]}
                    accessibilityLabel={`${item.name} 수량 줄이기`}
                  >
                    <Text style={{ fontSize: theme.fontButton, color: colors.text }}>−</Text>
                  </Pressable>
                  <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700', minWidth: 22, textAlign: 'center' }}>
                    {item.qty}
                  </Text>
                  <Pressable
                    onPress={() => cart.increaseQty(item.id)}
                    style={[styles.stepBtn, { minHeight: theme.minTouch - 8, minWidth: theme.minTouch - 8 }]}
                    accessibilityLabel={`${item.name} 수량 늘리기`}
                  >
                    <Text style={{ fontSize: theme.fontButton, color: colors.primary }}>+</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {bannerVisible && cart.lastScanned && (
        <View style={[styles.toast, { backgroundColor: colors.primarySurface, borderRadius: theme.radiusSm }]}>
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.primary, fontWeight: '700' }} numberOfLines={1}>
            ✓ 방금 담김: {cart.lastScanned.name} × {cart.lastScanned.qty} · {formatWon(cart.lastScanned.lineTotal)}
          </Text>
        </View>
      )}

      <Card style={[styles.footer, { gap: theme.spacing }]}>
        <View style={styles.summaryRow}>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>
            상품 {cart.itemCount}종 · {cart.totalQty}개
          </Text>
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>총 결제 예정</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>합계</Text>
          <Text style={{ fontSize: theme.fontDisplay, color: colors.text, fontWeight: '800' }}>
            {formatWon(cart.total)}
          </Text>
        </View>
        <PrimaryButton
          title="결제하기"
          onPress={() => router.push('/checkout')}
          disabled={cart.items.length === 0}
          variant="success"
        />
        <Pressable onPress={handleReturnCart} hitSlop={8} style={styles.returnBtn} accessibilityLabel="카트 반납">
          <Text style={{ fontSize: theme.fontBody - 1, color: colors.danger, fontWeight: '600', textAlign: 'center' }}>
            카트 반납하기
          </Text>
        </Pressable>
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  statusPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  mapButton: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  list: { flex: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyEmoji: { fontSize: 56 },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  itemIcon: { fontSize: 28 },
  itemInfo: { flex: 1, gap: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  stepBtn: { alignItems: 'center', justifyContent: 'center' },
  toast: { paddingVertical: 12, paddingHorizontal: 16, marginBottom: 10 },
  footer: { marginBottom: 8 },
  returnBtn: { paddingVertical: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
});
