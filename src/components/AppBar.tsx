import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/context/ModeContext';

/**
 * 화면 상단 바 — 뒤로가기 + 제목 + 우측 액션.
 *
 * 네이티브 Stack 헤더는 전부 껐다(`app/_layout.tsx`). 헤더와 SafeAreaView 상단 여백이
 * 겹쳐 화면이 아래로 밀리는 문제가 있었고, 화면마다 우측 액션을 자유롭게 넣기도 어려웠다.
 * 대신 모든 화면이 이 컴포넌트를 쓴다.
 */
export function AppBar({
  title,
  subtitle,
  onBack,
  right,
  showBack = true,
}: {
  title?: string;
  subtitle?: string;
  /** 기본은 router.back(). 되돌아갈 곳이 다르면 직접 넘긴다. */
  onBack?: () => void;
  right?: React.ReactNode;
  showBack?: boolean;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    // 진입 경로가 없을 때(딥링크·새로고침) 앱 밖으로 나가지 않도록 홈으로 보낸다.
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  return (
    <View style={[styles.bar, { minHeight: theme.minTouch + 6 }]}>
      {showBack ? (
        <Pressable
          onPress={handleBack}
          hitSlop={10}
          style={styles.iconSlot}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Icon name="chevronLeft" size={theme.fontBody + 10} color={colors.text} strokeWidth={2.4} />
        </Pressable>
      ) : (
        <View style={styles.iconSlot} />
      )}

      <View style={{ flex: 1, gap: 1 }}>
        {title ? (
          <Text style={{ fontSize: theme.fontButton - 2, color: colors.text, fontWeight: '800' }} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={styles.rightSlot}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  iconSlot: { width: 36, alignItems: 'flex-start', justifyContent: 'center' },
  rightSlot: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: 8 },
});
