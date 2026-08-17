import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar } from '@/components/AppBar';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ModeContext';
import { confirmAction } from '@/lib/confirm';

/** 탈퇴 시 사라지는 것/남는 것 안내 — 서버 UserWithdrawalService의 실제 동작과 맞춘 문구다. */
const NOTICES = [
  '계정 정보(이름·이메일)는 즉시 익명 처리되며 되돌릴 수 없어요.',
  '연결된 카트는 자동으로 반납되고 실시간 알림도 끊겨요.',
  '지난 주문·결제 기록은 거래 내역으로 남지만 내 계정과는 분리돼요.',
  '같은 이메일로 다시 가입할 수 있어요.',
];

/** 회원 탈퇴 화면 — 비밀번호로 본인 확인 후 계정을 익명화한다. 마이페이지에서 진입한다. */
export default function WithdrawScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { member, withdraw } = useAuth();

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 확인 다이얼로그를 한 번 더 띄운 뒤에만 실제 탈퇴를 호출한다. */
  function handlePress() {
    if (submitting || password.length === 0) return;
    confirmAction(
      '회원 탈퇴',
      '정말 탈퇴할까요? 계정 정보는 복구할 수 없어요.',
      () => void runWithdraw(),
      { confirmText: '탈퇴하기', destructive: true },
    );
  }

  async function runWithdraw() {
    setSubmitting(true);
    setError(null);
    try {
      await withdraw(password);
      // 세션은 withdraw()가 이미 비웠다. 뒤로가기로 앱 안쪽에 못 돌아오게 replace로 보낸다.
      router.replace('/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : '탈퇴에 실패했어요. 잠시 후 다시 시도해주세요.');
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <AppBar title="회원 탈퇴" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: theme.spacing }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: theme.fontTitle, color: colors.text, fontWeight: '800' }}>
              정말 떠나시나요?
            </Text>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, lineHeight: 22 }}>
              {member?.email ?? ''} 계정을 탈퇴합니다.
            </Text>
          </View>

          <Card style={{ gap: 10 }}>
            <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }}>
              탈퇴 전에 확인해주세요
            </Text>
            {NOTICES.map((notice) => (
              <View key={notice} style={styles.noticeRow}>
                <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
                <Text style={{ flex: 1, fontSize: theme.fontBody - 2, color: colors.textMuted, lineHeight: 20 }}>
                  {notice}
                </Text>
              </View>
            ))}
          </Card>

          <TextField
            label="비밀번호 확인"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (error) setError(null);
            }}
            placeholder="현재 비밀번호"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handlePress}
            invalid={!!error}
          />

          {error && (
            <View style={[styles.errorBox, { borderColor: colors.danger }]}>
              <Text style={{ fontSize: theme.fontBody - 1, color: colors.danger, lineHeight: 20 }}>{error}</Text>
            </View>
          )}

          {/* 안전한 쪽(돌아가기)을 주 CTA로 두고, 파괴적 액션은 마이페이지 로그아웃과 같은 저강조 버튼으로 둔다. */}
          <PrimaryButton title="돌아가기" onPress={() => router.back()} disabled={submitting} />
          <Pressable
            onPress={handlePress}
            disabled={submitting || password.length === 0}
            accessibilityRole="button"
            style={[
              styles.dangerButton,
              {
                borderColor: colors.danger,
                borderRadius: theme.radiusSm,
                minHeight: theme.minTouch,
                opacity: password.length === 0 ? 0.4 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <Text style={{ fontSize: theme.fontButton, color: colors.danger, fontWeight: '700' }}>탈퇴하기</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  errorBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  dangerButton: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
});
