import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandRefreshLoader } from '@/components/BrandLoader';
import { useBrandRefresh } from '@/components/BrandRefresh';
import { ListRowSkeleton } from '@/components/Skeleton';
import { TabTransition } from '@/components/TabTransition';
import { AppBar } from '@/components/AppBar';
import { BottomTabBar, useTabBarPadding } from '@/components/BottomTabBar';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProductImage } from '@/components/ProductImage';
import { EmptyState, QuantityStepper } from '@/components/commerce';
import { useCart } from '@/context/CartContext';
import { useCartSession } from '@/context/CartSessionContext';
import { useCatalog } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';
import { abandonOrder } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { formatWon } from '@/lib/format';
import { speakKo } from '@/lib/speak';

const GUTTER = 20;

/** 장바구니 — 카트가 인식한 상품이 SSE로 실시간 반영된다. 수량 조절·삭제·결제 진입. */
export default function CartScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { cartId, endSession, checkoutStatus, pendingOrder, refreshSession } = useCartSession();
  const { findProduct, isRestoring, refresh: refreshCatalog } = useCatalog();
  const cart = useCart();
  const bottomPad = useTabBarPadding();
  const insets = useSafeAreaInsets();
  // 탭바 실제 높이 = 토큰 높이 + 하단 safe area. 이걸 빼먹으면 결제 버튼이 탭바에 가린다.
  const tabBarTotal = theme.tabBarHeight + insets.bottom;
  const [bannerVisible, setBannerVisible] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  // 카트는 서버 세션(결제 대기 여부)과 상품 카탈로그를 함께 다시 맞춘다.
  const { refreshing, refreshControl } = useBrandRefresh(
    useCallback(() => Promise.all([refreshSession(), refreshCatalog()]), [refreshSession, refreshCatalog]),
  );
  // 결제 대기 중이면 서버가 카트를 잠근다 — 수량 변경·삭제·반납·스캔이 모두 거절된다.
  const locked = checkoutStatus === 'PAYMENT_PENDING';

  useEffect(() => {
    if (!cart.lastScanned) return undefined;
    setBannerVisible(true);
    // 노약자 모드: 화면을 보지 않아도 담긴 걸 알 수 있게 음성으로 안내한다.
    if (theme.voiceGuide) {
      const { name, qty } = cart.lastScanned;
      speakKo(qty > 1 ? `${name} ${qty}개 담겼습니다` : `${name} 담겼습니다`);
    }
    const timer = setTimeout(() => setBannerVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [cart.lastScanned, theme.voiceGuide]);

  /** 결제 대기 주문 포기 — 서버에서 주문을 만료시키면 카트 잠금이 풀린다. */
  function handleAbandon() {
    if (!pendingOrder || abandoning) return;
    confirmAction(
      '결제 포기',
      '진행 중인 결제를 취소하고 다시 담기로 돌아갈까요?',
      async () => {
        setAbandoning(true);
        try {
          await abandonOrder(pendingOrder.orderId);
        } catch (e) {
          // 이미 승인된 결제가 있으면 서버가 409로 막는다 — 사유를 그대로 보여준다.
          Alert.alert('결제 취소 실패', e instanceof Error ? e.message : '다시 시도해주세요.');
        } finally {
          await refreshSession();
          setAbandoning(false);
        }
      },
      { confirmText: '결제 포기', destructive: true },
    );
  }

  function handleReturnCart() {
    confirmAction(
      '카트 반납',
      '담긴 상품이 모두 사라지고 카트 연결이 해제돼요. 반납할까요?',
      () => {
        endSession(); // 서버 점유 해제 + 로컬 세션/장바구니 정리(캐스케이드)
        router.replace('/home');
      },
      { confirmText: '반납', destructive: true },
    );
  }

  const isLive = cart.connectionStatus === 'open';
  const empty = cart.items.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <TabTransition>
        <AppBar
          title="장바구니"
          onBack={() => router.replace('/home')}
          right={
            cart.items.length > 0 && !locked ? (
              <Pressable onPress={handleReturnCart} hitSlop={8} accessibilityLabel="카트 반납">
                <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, fontWeight: '600' }}>반납</Text>
              </Pressable>
            ) : null
          }
        />

        {/* 카트 연결 상태 */}
        <View style={{ paddingHorizontal: GUTTER, paddingBottom: 10 }}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: isLive ? colors.successSurface : colors.surface, borderRadius: theme.radiusSm },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: isLive ? colors.success : colors.textMuted }]} />
            <Text style={{ flex: 1, fontSize: theme.fontBody - 3, color: colors.text, fontWeight: '600' }}>
              {isLive
                ? `${cartId} 연결됨 · 담으면 바로 반영돼요`
                : cart.connectionStatus === 'connecting'
                  ? '카트 연결 중…'
                  : '카트가 연결되지 않았어요'}
            </Text>
            {!isLive ? (
              <Pressable onPress={() => router.push('/connect')} hitSlop={8}>
                <Text style={{ fontSize: theme.fontBody - 3, color: colors.primary, fontWeight: '800' }}>연결</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* 결제 대기 배너 — 앱을 껐다 켜도 서버(pendingOrder)에서 복구된다. */}
        {locked && pendingOrder ? (
          <View style={{ paddingHorizontal: GUTTER, paddingBottom: 10 }}>
            <View style={[styles.pendingBox, { backgroundColor: colors.warningSurface, borderRadius: theme.radiusSm }]}>
              <Text style={{ fontSize: theme.fontBody - 2, color: colors.warningText, fontWeight: '700' }}>
                결제가 진행 중이에요
              </Text>
              <Text style={{ fontSize: theme.fontBody - 3, color: colors.warningText }}>
                {pendingOrder.orderName} · {formatWon(pendingOrder.amount)}
                {'\n'}결제를 끝내거나 포기하기 전까지는 상품을 담거나 뺄 수 없어요.
              </Text>
              <View style={styles.pendingActions}>
                <Pressable
                  onPress={handleAbandon}
                  disabled={abandoning}
                  hitSlop={8}
                  style={{ minHeight: theme.minTouch, justifyContent: 'center' }}
                  accessibilityLabel="결제 포기"
                >
                  <Text style={{ fontSize: theme.fontBody - 2, color: colors.danger, fontWeight: '700' }}>
                    {abandoning ? '취소하는 중…' : '결제 포기'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/checkout')}
                  hitSlop={8}
                  style={{ minHeight: theme.minTouch, justifyContent: 'center' }}
                  accessibilityLabel="이어서 결제"
                >
                  <Text style={{ fontSize: theme.fontBody - 2, color: colors.primary, fontWeight: '800' }}>
                    이어서 결제
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: bottomPad + (empty ? 0 : 130) }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <BrandRefreshLoader visible={refreshing} />
          {isRestoring ? (
            <View>
              {[0, 1, 2].map((i) => (
                <ListRowSkeleton key={i} />
              ))}
            </View>
          ) : empty ? (
            <EmptyState
              title="아직 담긴 상품이 없어요"
              description={'카트에 상품을 넣으면\n여기에 실시간으로 나타나요'}
              action={
                <View style={{ marginTop: 10, alignSelf: 'stretch', paddingHorizontal: 30 }}>
                  <PrimaryButton title="상품 둘러보기" variant="neutral" onPress={() => router.replace('/products')} />
                </View>
              }
            />
          ) : (
            <View style={{ gap: 4 }}>
              {cart.items.map((item, index) => {
                const catalog = findProduct(item.id);
                return (
                  <View key={item.id}>
                    {index > 0 ? <View style={[styles.rowDivider, { backgroundColor: colors.border }]} /> : null}
                    <View style={styles.itemRow}>
                      <ProductImage
                        id={item.id}
                        name={item.name}
                        zone={catalog?.zone}
                        uri={catalog?.imageUrl}
                        size={72}
                        radius={theme.imageRadius}
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text
                          style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>
                          개당 {formatWon(item.unitPrice)}
                        </Text>
                        <View style={styles.itemBottom}>
                          <Text style={{ fontSize: theme.fontBody + 1, color: colors.text, fontWeight: '800' }}>
                            {formatWon(item.unitPrice * item.qty)}
                          </Text>
                          <View style={{ flex: 1 }} />
                          <QuantityStepper
                            quantity={item.qty}
                            disabled={locked}
                            onChange={(next) => (next > item.qty ? cart.increaseQty(item.id) : cart.decreaseQty(item.id))}
                          />
                          <Pressable
                            onPress={() => cart.removeItem(item.id)}
                            disabled={locked}
                            hitSlop={8}
                            style={{ padding: 4, opacity: locked ? 0.35 : 1 }}
                            accessibilityLabel={`${item.name} 삭제`}
                          >
                            <Icon name="trash" size={18} color={colors.textMuted} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* 방금 담김 토스트 */}
        {bannerVisible && cart.lastScanned ? (
          <View style={[styles.toast, { bottom: tabBarTotal + 130, backgroundColor: colors.text }]}>
            <Icon name="check" size={16} color="#FFFFFF" strokeWidth={3} />
            <Text style={{ flex: 1, fontSize: theme.fontBody - 2, color: '#FFFFFF', fontWeight: '600' }} numberOfLines={1}>
              {cart.lastScanned.name} × {cart.lastScanned.qty} 담겼어요
            </Text>
          </View>
        ) : null}

        {/* 결제 요약 (고정) */}
        {!empty ? (
          <View
            style={[
              styles.summary,
              { bottom: tabBarTotal, backgroundColor: colors.card, borderTopColor: colors.border },
            ]}
          >
            <View style={styles.summaryRow}>
              <Text style={{ fontSize: theme.fontBody - 1, color: colors.textMuted }}>
                상품 {cart.itemCount}종 · {cart.totalQty}개
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: theme.fontAmount, color: colors.text, fontWeight: '800' }}>
                {formatWon(cart.total)}
              </Text>
            </View>
            <PrimaryButton
              title={locked ? '이어서 결제하기' : `${formatWon(cart.total)} 결제하기`}
              variant="success"
              onPress={() => router.push('/checkout')}
            />
          </View>
        ) : null}
      </TabTransition>

      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  pendingBox: { gap: 6, paddingVertical: 12, paddingHorizontal: 14 },
  pendingActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  rowDivider: { height: StyleSheet.hairlineWidth },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  summary: {
    position: 'absolute',
    left: 0,
    right: 0,
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline' },
});
