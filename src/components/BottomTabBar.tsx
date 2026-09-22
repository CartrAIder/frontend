import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { setTabDirection } from '@/components/TabTransition';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ModeContext';

/**
 * 바텀 탭바 — 홈 · 카테고리 · [스캔] · 장바구니 · 마이.
 *
 * expo-router 의 Tabs 로 감싸는 대신 화면마다 이 컴포넌트를 깔았다. 라우트 구조를
 * 건드리지 않아 기존 네비게이션이 그대로 살고, 가운데 스캔 버튼처럼 관례를 벗어난
 * 모양을 자유롭게 그릴 수 있다.
 *
 * 화면 쪽에서는 ScrollView 아래 여백으로 `useTabBarPadding()` 을 써야 마지막 항목이
 * 탭바에 가리지 않는다.
 */

interface TabItem {
  key: string;
  label: string;
  icon: IconName;
  href: string;
  /** 활성으로 볼 경로들(상세 화면에서도 탭이 켜져 보이게). */
  match: string[];
}

const TABS: TabItem[] = [
  { key: 'home', label: '홈', icon: 'home', href: '/home', match: ['/home'] },
  {
    key: 'category',
    label: '카테고리',
    icon: 'grid',
    href: '/products',
    match: ['/products', '/product'],
  },
  { key: 'cart', label: '장바구니', icon: 'cart', href: '/cart', match: ['/cart'] },
  { key: 'my', label: '마이', icon: 'user', href: '/mypage', match: ['/mypage'] },
];

/** 탭바에 가리지 않도록 스크롤 하단에 줄 여백. */
export function useTabBarPadding(): number {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return theme.tabBarHeight + insets.bottom + 16;
}

export function BottomTabBar() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { totalQty } = useCart();

  const isActive = (tab: TabItem) =>
    tab.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

  /**
   * 탭 이동. 이미 그 탭이면 아무것도 하지 않고, 아니면 탭 순서 기준으로
   * 들어올 방향(오른쪽 탭 → 오른쪽에서, 왼쪽 탭 → 왼쪽에서)을 정해 넘긴다.
   */
  function goTab(tab: TabItem) {
    if (isActive(tab)) return;
    const from = TABS.findIndex(isActive);
    const to = TABS.indexOf(tab);
    setTabDirection(from === -1 || to > from ? 'right' : 'left');
    router.replace(tab.href as never);
  }

  // 가운데 스캔 버튼을 끼우기 위해 좌 2개 / 우 2개로 나눈다.
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
          height: theme.tabBarHeight + insets.bottom,
        },
      ]}
    >
      {left.map((tab) => (
        <TabButton key={tab.key} tab={tab} active={isActive(tab)} onPress={() => goTab(tab)} />
      ))}

      {/* 가운데 스캔 — 이 앱의 핵심 동선이라 크게 띄운다 */}
      <Pressable
        onPress={() => router.push('/connect')}
        style={styles.scanSlot}
        android_ripple={{ color: colors.ripple, borderless: true, radius: 40 }}
        accessibilityRole="button"
        accessibilityLabel="카트 QR 스캔"
      >
        <View
          style={[
            styles.scanButton,
            theme.shadowCard,
            {
              backgroundColor: colors.primary,
              width: theme.minTouch + 12,
              height: theme.minTouch + 12,
            },
          ]}
        >
          <Icon
            name="scan"
            size={theme.minTouch - 18}
            color={colors.primaryText}
            strokeWidth={2.2}
          />
        </View>
        <Text style={{ fontSize: theme.fontBody - 6, color: colors.primary, fontWeight: '800' }}>
          스캔
        </Text>
      </Pressable>

      {right.map((tab) => (
        <TabButton
          key={tab.key}
          tab={tab}
          active={isActive(tab)}
          badge={tab.key === 'cart' ? totalQty : 0}
          onPress={() => goTab(tab)}
        />
      ))}
    </View>
  );
}

function TabButton({
  tab,
  active,
  badge = 0,
  onPress,
}: {
  tab: TabItem;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const tint = active ? colors.primary : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      android_ripple={{ color: colors.ripple, borderless: true, radius: 36 }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
    >
      <View>
        <Icon
          name={tab.icon}
          size={theme.fontBody + 8}
          color={tint}
          filled={active}
          strokeWidth={active ? 2.3 : 2}
        />
        {badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.discount }]}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={{ fontSize: theme.fontBody - 6, color: tint, fontWeight: active ? '800' : '600' }}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 3 },
  scanSlot: { flex: 1, alignItems: 'center', gap: 3, marginTop: -22 },
  scanButton: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, color: '#FFFFFF', fontWeight: '800' },
});
