import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { AppBar } from '@/components/AppBar';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useCartSession } from '@/context/CartSessionContext';
import { useTheme } from '@/context/ModeContext';
import { formatWon } from '@/lib/format';
import { speakKo, stopSpeaking } from '@/lib/speak';

interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
}

function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 결제 완료 — 성공 헤더 + 결제 금액 + QR 영수증 + 저장/홈.
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
  const [expanded, setExpanded] = useState(false);

  const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
  const summaryText =
    items.length === 0
      ? '상품 내역 없음'
      : items.length === 1
        ? items[0].name
        : `${items[0].name} 외 ${items.length - 1}개`;

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
      // 저장 이미지는 항상 전체 내역이 담기도록, 캡처 전에 상세를 펼친다.
      if (!expanded) {
        setExpanded(true);
        await new Promise((resolve) => setTimeout(resolve, 80));
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <AppBar title="결제 완료" showBack={false} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 성공 헤더 — 금액을 가장 크게 */}
        <View style={styles.successHead}>
          <View style={[styles.checkRing, { backgroundColor: colors.successSurface }]}>
            <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
              <Icon name="check" size={30} color="#FFFFFF" strokeWidth={3.2} />
            </View>
          </View>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>결제가 완료되었어요</Text>
          <Text style={{ fontSize: theme.fontDisplay, color: colors.text, fontWeight: '800', letterSpacing: -0.5 }}>
            {formatWon(amount)}
          </Text>
          <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>
            {summaryText} · 총 {totalQty}개
          </Text>
        </View>

        {/* 영수증 카드 (캡처 대상) */}
        <View ref={receiptRef} collapsable={false} style={styles.receipt}>
          <View style={styles.receiptHead}>
            <Text style={styles.brand}>CartrAIder</Text>
            <Text style={styles.receiptLabel}>결제 영수증</Text>
          </View>

          <View style={styles.qrWrap}>
            <QRCode value={receiptId} size={124} />
          </View>
          <Text style={styles.qrHint}>계산대에서 이 코드를 보여주세요</Text>

          <View style={styles.dashed} />

          <View style={styles.metaRow}>
            <Text style={styles.metaK}>주문번호</Text>
            <Text style={styles.metaV} numberOfLines={1} ellipsizeMode="middle">
              {receiptId}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaK}>결제일시</Text>
            <Text style={styles.metaV}>{formatDateTime(paidAt)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaK}>결제수단</Text>
            <Text style={styles.metaV}>토스페이먼츠</Text>
          </View>

          <View style={styles.dashed} />

          {items.length === 0 ? (
            <Text style={styles.itemMuted}>상품 내역 없음</Text>
          ) : expanded ? (
            items.map((it, i) => (
              <View key={`${it.name}-${i}`} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {it.name}
                </Text>
                <Text style={styles.itemQty}>{it.qty}개</Text>
                <Text style={styles.itemAmt}>{formatWon(it.unitPrice * it.qty)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {summaryText}
              </Text>
              <Text style={styles.itemQty}>총 {totalQty}개</Text>
            </View>
          )}

          <View style={styles.dashed} />

          <View style={styles.totalRow}>
            <Text style={styles.totalK}>총 결제금액</Text>
            <Text style={styles.totalV}>{formatWon(amount)}</Text>
          </View>

          <Text style={styles.thanks}>이용해 주셔서 감사합니다</Text>
        </View>

        {/* 상세정보 보기 — 2개 이상일 때만. 영수증 카드 밖이라 캡처엔 안 들어간다. */}
        {items.length > 1 ? (
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            style={[styles.detailToggle, { minHeight: theme.minTouch }]}
            hitSlop={8}
          >
            <Text style={{ fontSize: theme.fontBody - 1, color: colors.textMuted, fontWeight: '700' }}>
              {expanded ? '상세 접기' : '상품 상세 보기'}
            </Text>
            <Icon name={expanded ? 'chevronLeft' : 'chevronRight'} size={14} color={colors.textMuted} strokeWidth={2.6} />
          </Pressable>
        ) : null}
      </ScrollView>

      {/* 하단 고정 액션 */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleSaveReceipt}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              borderColor: colors.border,
              borderRadius: theme.radiusSm,
              minHeight: theme.minTouch,
              opacity: saving || pressed ? 0.6 : 1,
            },
          ]}
          accessibilityLabel="영수증 이미지 저장"
        >
          {saving ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Icon name="receipt" size={18} color={colors.text} />
              <Text style={{ fontSize: theme.fontBody - 1, color: colors.text, fontWeight: '700' }}>영수증 저장</Text>
            </>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <PrimaryButton title="쇼핑 종료" onPress={handleRestart} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  successHead: { alignItems: 'center', gap: 5, paddingTop: 8, paddingBottom: 4 },
  checkRing: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  checkCircle: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },

  // ── 영수증(문서) — 캡처 이미지가 모드와 무관하게 일관되도록 고정 스타일 ──
  receipt: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EDF0F5',
    paddingHorizontal: 22,
    paddingVertical: 22,
    alignItems: 'center',
  },
  receiptHead: { alignItems: 'center', gap: 2, marginBottom: 14 },
  brand: { fontSize: 19, fontWeight: '800', color: '#2563EB', letterSpacing: -0.3 },
  receiptLabel: { fontSize: 12, color: '#9CA3AF', letterSpacing: 1.5 },
  qrWrap: { padding: 10, backgroundColor: '#FFFFFF', borderRadius: 12 },
  qrHint: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  dashed: {
    alignSelf: 'stretch',
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    marginVertical: 14,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 3, gap: 12 },
  metaK: { fontSize: 13, color: '#9CA3AF' },
  metaV: { fontSize: 13, color: '#111827', fontWeight: '600', flexShrink: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingVertical: 4, gap: 10 },
  itemName: { fontSize: 14, color: '#111827', flex: 1 },
  itemQty: { fontSize: 13, color: '#9CA3AF' },
  itemAmt: { fontSize: 14, color: '#111827', fontWeight: '700', minWidth: 72, textAlign: 'right' },
  itemMuted: { fontSize: 13, color: '#9CA3AF', paddingVertical: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', alignItems: 'baseline' },
  totalK: { fontSize: 14, color: '#111827', fontWeight: '700' },
  totalV: { fontSize: 22, color: '#111827', fontWeight: '800', letterSpacing: -0.5 },
  thanks: { fontSize: 11, color: '#C4C9D2', marginTop: 16 },

  detailToggle: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
});
