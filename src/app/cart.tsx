import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { confirmAction } from '@/lib/confirm';
import { formatWon } from '@/lib/format';
import { speakKo } from '@/lib/speak';

const GUTTER = 20;

/** 장바구니 — 카트가 인식한 상품이 SSE로 실시간 반영된다. 수량 조절·삭제·결제 진입. */
export default function CartScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { cartId, endSession } = useCartSession();
  const { findProduct, isRestoring } = useCatalog();
  const cart = useCart();
  const bottomPad = useTabBarPadding();
  const insets = useSafeAreaInsets();
  // 탭바 실제 높이 = 토큰 높이 + 하단 safe area. 이걸 빼먹으면 결제 버튼이 탭바에 가린다.
  const tabBarTotal = theme.tabBarHeight + insets.bottom;
  const [bannerVisible, setBannerVisible] = useState(false);

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
            cart.items.length > 0 ? (
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

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: bottomPad + (empty ? 0 : 130) }}
          showsVerticalScrollIndicator={false}
        >
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
                            onChange={(next) => (next > item.qty ? cart.increaseQty(item.id) : cart.decreaseQty(item.id))}
                          />
                          <Pressable
                            onPress={() => cart.removeItem(item.id)}
                            hitSlop={8}
                            style={{ padding: 4 }}
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
            <PrimaryButton title={`${formatWon(cart.total)} 결제하기`} variant="success" onPress={() => router.push('/checkout')} />
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
