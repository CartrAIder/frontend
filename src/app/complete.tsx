import * as Speech from 'expo-speech';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useCartSession } from '@/context/CartSessionContext';
import { useTheme } from '@/context/ModeContext';

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

/** (4) 결제 완료 화면 — QR 영수증을 보여주고, senior 모드에서는 음성으로도 안내한다. */
export default function CompleteScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { endSession } = useCartSession();
  const params = useLocalSearchParams<{ receiptId?: string; amount?: string }>();

  const receiptId = params.receiptId ?? '—';
  const amount = Number(params.amount ?? 0);

  // 결제 완료 화면 진입 = 결제 플로우 종료 → 카트 세션 자동 반납(서버 점유 해제 + 로컬 정리).
  useEffect(() => {
    endSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // 세션은 이미 진입 시 반납됨(위 useEffect). 홈으로 이동만.
    router.replace('/home');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={styles.body}>
        <View style={[styles.checkRing, { backgroundColor: colors.successSurface }]}>
          <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        </View>
        <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.text }]}>결제 완료!</Text>
        <Text style={{ fontSize: theme.fontDisplay, color: colors.text, fontWeight: '800' }}>{formatWon(amount)}</Text>
        <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>결제가 성공적으로 처리되었어요</Text>

        <Card style={styles.receiptCard}>
          <View style={styles.qrWrap}>
            <QRCode value={receiptId} size={150} />
          </View>
          <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>영수증 번호</Text>
          <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>#{receiptId}</Text>
          {theme.voiceGuide && (
            <Text style={{ fontSize: theme.fontBody - 2, color: colors.primary, textAlign: 'center', marginTop: 4 }}>
              🔊 영수증을 음성으로 읽어드릴게요
            </Text>
          )}
        </Card>

        <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, textAlign: 'center' }}>
          출구 직원에게 이 화면을 보여주셔도 됩니다
        </Text>
      </View>

      <PrimaryButton title="쇼핑 종료 · 홈으로" onPress={handleRestart} style={{ marginBottom: 8 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  checkRing: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  checkCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 38, color: '#FFFFFF', fontWeight: '800' },
  title: { fontWeight: '800' },
  receiptCard: { alignItems: 'center', gap: 4, marginTop: 16, alignSelf: 'stretch' },
  qrWrap: { padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12 },
  receiptDivider: { height: 1, alignSelf: 'stretch', marginVertical: 12 },
});
