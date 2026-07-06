import * as Speech from 'expo-speech';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ModeContext';

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

/** (4) 결제 완료 화면 — QR 영수증을 보여주고, senior 모드에서는 음성으로도 안내한다. */
export default function CompleteScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { logout } = useAuth();
  const cart = useCart();
  const params = useLocalSearchParams<{ receiptId?: string; amount?: string }>();

  const receiptId = params.receiptId ?? '—';
  const amount = Number(params.amount ?? 0);

  useEffect(() => {
    if (!theme.voiceGuide) return;
    Speech.speak(`결제가 완료되었습니다. 결제 금액은 ${amount.toLocaleString('ko-KR')}원입니다.`, {
      language: 'ko-KR',
    });
    return () => {
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.voiceGuide]);

  function handleRestart() {
    Speech.stop();
    cart.reset();
    logout();
    router.replace('/');
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <View style={styles.body}>
        <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
        <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.success }]}>
          결제 완료!
        </Text>
        <Text style={{ fontSize: theme.fontAmount, color: colors.text, fontWeight: '700' }}>
          {formatWon(amount)} 이 결제되었습니다
        </Text>

        <View style={[styles.qrBox, { borderColor: colors.border, padding: theme.spacing }]}>
          <QRCode value={receiptId} size={160} />
        </View>
        <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>
          영수증 번호: #{receiptId}
        </Text>

        {theme.voiceGuide && (
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.primary, textAlign: 'center' }}>
            🔊 영수증을 음성으로 읽어드릴게요
          </Text>
        )}
        <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, textAlign: 'center' }}>
          출구 직원에게 이 화면을 보여주셔도 됩니다
        </Text>
      </View>

      <Pressable
        onPress={handleRestart}
        style={[styles.restartButton, { backgroundColor: colors.primary, minHeight: theme.minTouch }]}
      >
        <Text style={{ fontSize: theme.fontButton, color: colors.primaryText, fontWeight: '700' }}>
          처음으로 돌아가기
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  checkMark: { fontSize: 36, color: '#FFFFFF', fontWeight: '700' },
  title: { fontWeight: '700' },
  qrBox: { borderWidth: 1, borderRadius: 16, marginTop: 8 },
  restartButton: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
