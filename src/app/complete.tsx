import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useCartSession } from '@/context/CartSessionContext';
import { useTheme } from '@/context/ModeContext';
import { speakKo, stopSpeaking } from '@/lib/speak';

interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
}

function formatWon(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * (4) 결제 완료 화면 — QR + 주문 내역 영수증을 보여주고 이미지로 저장(다운로드)할 수 있다.
 * 영수증 데이터는 방금 결제한 주문(카트에서 캡처)으로 구성하므로 서버 조회가 필요 없다.
 */
export default function CompleteScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { endSession } = useCartSession();
  const params = useLocalSearchParams<{
    receiptId?: string;
    amount?: string;
    orderName?: string;
    items?: string;
    paidAt?: string;
  }>();

  const receiptId = params.receiptId ?? '—';
  const amount = Number(params.amount ?? 0);
  const paidAt = Number(params.paidAt ?? Date.now());
  const items: ReceiptItem[] = useMemo(() => {
    try {
      return params.items ? (JSON.parse(params.items) as ReceiptItem[]) : [];
    } catch {
      return [];
    }
  }, [params.items]);

  const receiptRef = useRef<View>(null);
  const [saving, setSaving] = useState(false);

  // 결제 완료 화면 진입 = 결제 플로우 종료 → 카트 세션 자동 반납.
  useEffect(() => {
    endSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!theme.voiceGuide) return;
    speakKo(`결제가 완료되었습니다. 결제 금액은 ${amount.toLocaleString('ko-KR')}원입니다.`);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.voiceGuide]);

  async function handleSaveReceipt() {
    if (saving) return;
    setSaving(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '영수증을 저장하려면 사진 접근 권한이 필요해요.');
        return;
      }
      const uri = await captureRef(receiptRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '영수증 이미지를 사진에 저장했어요.');
    } catch {
      Alert.alert('저장 실패', '영수증 저장에 실패했어요. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  function handleRestart() {
    stopSpeaking();
    router.replace('/home');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.checkRing, { backgroundColor: colors.successSurface }]}>
          <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        </View>
        <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.text }]}>결제 완료!</Text>
        <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, marginBottom: 6 }}>
          결제가 성공적으로 처리되었어요
        </Text>

        {/* 캡처 대상 영수증 — 문서처럼 일관되게 보이도록 흰 배경 + 고정 스타일 */}
        <View ref={receiptRef} collapsable={false} style={styles.receipt}>
          <Text style={styles.brand}>CartrAIder</Text>
          <Text style={styles.receiptLabel}>결제 영수증</Text>

          <View style={styles.qrWrap}>
            <QRCode value={receiptId} size={132} />
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaK}>주문번호</Text>
            <Text style={styles.metaV} numberOfLines={1}>
              {receiptId}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaK}>결제일시</Text>
            <Text style={styles.metaV}>{formatDateTime(paidAt)}</Text>
          </View>

          <View style={styles.dashed} />

          {items.length > 0 ? (
            items.map((it, i) => (
              <View key={`${it.name}-${i}`} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {it.name} <Text style={styles.itemQty}>× {it.qty}</Text>
                </Text>
                <Text style={styles.itemAmt}>{formatWon(it.unitPrice * it.qty)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.itemMuted}>상품 내역 없음</Text>
          )}

          <View style={styles.dashed} />

          <View style={styles.totalRow}>
            <Text style={styles.totalK}>총 결제금액</Text>
            <Text style={styles.totalV}>{formatWon(amount)}</Text>
          </View>

          <Text style={styles.thanks}>이용해 주셔서 감사합니다 🛒</Text>
        </View>

        <PrimaryButton
          title={saving ? '저장 중…' : '📥 영수증 이미지 저장'}
          variant="neutral"
          onPress={handleSaveReceipt}
          loading={saving}
          style={{ alignSelf: 'stretch', marginTop: 16 }}
        />
      </ScrollView>

      <PrimaryButton title="쇼핑 종료 · 홈으로" onPress={handleRestart} style={{ marginBottom: 8 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  body: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  checkRing: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  checkCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 32, color: '#FFFFFF', fontWeight: '800' },
  title: { fontWeight: '800' },
  // ── 영수증(문서) — 캡처 이미지가 모드와 무관하게 일관되도록 고정 스타일 ──
  receipt: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  brand: { fontSize: 20, fontWeight: '800', color: '#2563EB', letterSpacing: 0.3 },
  receiptLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  qrWrap: { padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 2 },
  metaK: { fontSize: 13, color: '#6B7280' },
  metaV: { fontSize: 13, color: '#111827', fontWeight: '600', flexShrink: 1, marginLeft: 12 },
  dashed: { alignSelf: 'stretch', height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#D1D5DB', marginVertical: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 3, gap: 12 },
  itemName: { fontSize: 15, color: '#111827', flex: 1 },
  itemQty: { color: '#6B7280' },
  itemAmt: { fontSize: 15, color: '#111827', fontWeight: '600' },
  itemMuted: { fontSize: 14, color: '#9CA3AF', paddingVertical: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', alignItems: 'center' },
  totalK: { fontSize: 15, color: '#111827', fontWeight: '700' },
  totalV: { fontSize: 20, color: '#111827', fontWeight: '800' },
  thanks: { fontSize: 12, color: '#9CA3AF', marginTop: 12 },
});
