import { Redirect } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useCartSession } from '@/context/CartSessionContext';
import { useTheme } from '@/context/ModeContext';

/**
 * 라우팅 게이트 — 복원된 회원 세션에 따라 알맞은 화면으로 보낸다.
 *  복원 중 → 스플래시 · 미로그인 → /login · 로그인 → /home(허브)
 * 진행 중인 카트가 있어도 홈에서 "쇼핑 계속하기"로 이어가므로 항상 /home으로 보낸다.
 */
export default function IndexGate() {
  const theme = useTheme();
  const { colors } = theme;
  const auth = useAuth();
  const session = useCartSession();

  if (auth.isRestoring || session.isRestoring) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
          <Image
            source={require('../../assets/logo/mark-white-512.png')}
            style={styles.logoMark}
            resizeMode="contain"
          />
        </View>
        <Text style={{ fontSize: theme.fontDisplay, color: colors.text, fontWeight: '800', letterSpacing: 0.3 }}>
          CartrAIder
        </Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (!auth.isAuthenticated) return <Redirect href="/login" />;
  return <Redirect href="/home" />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  logoBadge: { width: 92, height: 92, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  logoMark: { width: 56, height: 56 },
});
