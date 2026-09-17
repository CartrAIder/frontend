import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ModeContext';

/**
 * 브랜드 로더 — 로고 + 진행바.
 *
 * 세션 복원·카트 연결·결제 승인처럼 몇 초 기다려야 하는 지점에서 쓴다. 스피너만 돌리면
 * "멈춘 건지 도는 건지" 알기 어렵고 앱 정체성도 사라져서, 로고와 함께 진행바를 보여준다.
 *
 * 진행률을 알 수 없는 작업이라 막대가 좌→우로 흐르는 indeterminate 방식이다.
 * RN 내장 Animated + translateX(네이티브 드라이버)라 별도 설정이 필요 없다.
 */

const TRACK_W = 180;
const FILL_W = 64;

/** 좌→우로 흐르는 진행바. */
function ProgressTrack({ tint, track }: { tint: string; track: string }) {
  const x = useRef(new Animated.Value(-FILL_W)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: TRACK_W,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);

  return (
    <View style={[styles.track, { backgroundColor: track }]}>
      <Animated.View
        style={[styles.fill, { backgroundColor: tint, transform: [{ translateX: x }] }]}
      />
    </View>
  );
}

/** 로고 + 워드마크 + 진행바 묶음. */
function Brand({ message, onDark = false }: { message?: string; onDark?: boolean }) {
  const theme = useTheme();
  const { colors } = theme;
  const textColor = onDark ? '#FFFFFF' : colors.text;
  const mutedColor = onDark ? 'rgba(255,255,255,0.7)' : colors.textMuted;

  return (
    <View style={styles.brand}>
      <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
        <Image
          source={require('../../assets/logo/mark-white-512.png')}
          style={styles.logoMark}
          resizeMode="contain"
        />
      </View>
      <Text style={{ fontSize: theme.fontTitle, color: textColor, fontWeight: '800', letterSpacing: -0.4 }}>
        CartrAIder
      </Text>
      <ProgressTrack tint={colors.primary} track={onDark ? 'rgba(255,255,255,0.2)' : colors.border} />
      {message ? (
        <Text style={{ fontSize: theme.fontBody - 2, color: mutedColor, textAlign: 'center' }}>{message}</Text>
      ) : null}
    </View>
  );
}

/** 화면 전체를 채우는 로더 — 앱 부팅·라우트 가드처럼 화면에 아직 아무것도 없을 때. */
export function BrandLoader({ message }: { message?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.full, { backgroundColor: colors.background }]}>
      <Brand message={message} />
    </View>
  );
}

/**
 * 당겨서 새로고침용 컴팩트 로더 — 로고 뱃지 + 같은 진행바를 한 줄로 눕힌 형태.
 *
 * 전체화면/오버레이 로더는 화면을 가리고 터치를 막아서, 1초 남짓이면 끝나는 새로고침에는
 * 과하다. 그래서 같은 브랜드 요소(로고·진행바)를 그대로 쓰되 목록 위에 얇게 얹는다.
 * `visible` 이 false 면 아무것도 그리지 않아 레이아웃도 차지하지 않는다.
 */
export function BrandRefreshLoader({ visible, message }: { visible: boolean; message?: string }) {
  const theme = useTheme();
  const { colors } = theme;
  if (!visible) return null;

  return (
    <View style={[styles.refreshRow, { backgroundColor: colors.card, borderRadius: theme.radiusSm }]}>
      <View style={[styles.refreshBadge, { backgroundColor: colors.primary }]}>
        <Image
          source={require('../../assets/logo/mark-white-512.png')}
          style={styles.refreshMark}
          resizeMode="contain"
        />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted, fontWeight: '600' }}>
          {message ?? '새로고침 중…'}
        </Text>
        <ProgressTrack tint={colors.primary} track={colors.border} />
      </View>
    </View>
  );
}

/**
 * 화면 위에 덮는 로더 — 이미 내용이 있는 화면에서 작업이 도는 동안.
 * `visible` 이 false 면 아무것도 그리지 않는다.
 */
export function BrandLoaderOverlay({ visible, message }: { visible: boolean; message?: string }) {
  if (!visible) return null;
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <Brand message={message} onDark />
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  brand: { alignItems: 'center', gap: 14, paddingHorizontal: 32 },
  logoBadge: { width: 84, height: 84, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  logoMark: { width: 52, height: 52 },
  track: { width: TRACK_W, height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  refreshRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  refreshBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  refreshMark: { width: 20, height: 20 },
  fill: { width: FILL_W, height: 4, borderRadius: 2 },
});
