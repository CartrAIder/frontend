import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { AppBar } from '@/components/AppBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ModeContext';
import { checkPassword, isPasswordValid, PASSWORD_RULE_TEXT } from '@/lib/api';

/** 비밀번호 변경 화면(로그인 상태) — 마이페이지에서 진입한다. */
export default function PasswordChangeScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const passwordConfirmRef = useRef<TextInput>(null);

  const pwChecks = checkPassword(password);
  const pwValid = isPasswordValid(password);
  const pwMatch = passwordConfirm.length > 0 && password === passwordConfirm;
  const sameAsCurrent = password.length > 0 && password === currentPassword;
  const formValid = currentPassword.length > 0 && pwValid && pwMatch && !sameAsCurrent;

  const confirmError = passwordConfirm.length > 0 && password !== passwordConfirm ? '비밀번호가 일치하지 않아요' : null;
  const newPasswordError = sameAsCurrent ? '현재 비밀번호와 다른 비밀번호를 입력해주세요' : null;

  async function handleSubmit() {
    if (submitting || !formValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await changePassword(currentPassword, password);
      setSucceeded(true);
      setTimeout(() => router.back(), 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : '비밀번호 변경에 실패했어요. 다시 시도해주세요.');
      setSubmitting(false);
    }
  }

  // ── 완료 화면 ────────────────────────────────────────────────────────
  if (succeeded) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.successBadge, { backgroundColor: colors.successSurface }]}>
          <Icon name="check" size={44} color={colors.success} strokeWidth={3.2} />
        </View>
        <Text style={{ fontSize: theme.fontTitle, color: colors.text, fontWeight: '800', marginTop: 20 }}>
          비밀번호를 바꿨어요
        </Text>
        <Text
          style={{ fontSize: theme.fontBody, color: colors.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 22 }}
        >
          이 기기는 그대로 로그인 상태예요.{'\n'}다른 기기에서는 다시 로그인이 필요할 수 있어요.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <AppBar title="비밀번호 변경" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: theme.spacing }}
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            label="현재 비밀번호"
            value={currentPassword}
            onChangeText={(t) => {
              setCurrentPassword(t);
              if (error) setError(null);
            }}
            placeholder="현재 비밀번호"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
            invalid={!!error}
          />

          <View style={{ gap: 8 }}>
            <TextField
              ref={passwordRef}
              label="새 비밀번호"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError(null);
              }}
              placeholder="새 비밀번호"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => passwordConfirmRef.current?.focus()}
              submitBehavior="submit"
              error={newPasswordError}
            />
            <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>{PASSWORD_RULE_TEXT}</Text>
            {password.length > 0 && (
              <View style={styles.checklist}>
                <Requirement met={pwChecks.length} label="8~20자" />
                <Requirement met={pwChecks.letter} label="영문" />
                <Requirement met={pwChecks.digit} label="숫자" />
                <Requirement met={pwChecks.special} label="특수문자" />
              </View>
            )}
          </View>

          <TextField
            ref={passwordConfirmRef}
            label="새 비밀번호 확인"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            placeholder="새 비밀번호 다시 입력"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            error={confirmError}
          />

          {error && (
            <View style={[styles.errorBox, { borderColor: colors.danger }]}>
              <Text style={{ fontSize: theme.fontBody - 1, color: colors.danger, lineHeight: 20 }}>{error}</Text>
            </View>
          )}

          <PrimaryButton
            title="비밀번호 변경"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!formValid}
            style={{ marginTop: 4 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** 비밀번호 조건 한 칸 — 회원가입·비밀번호 찾기 화면과 같은 표시 규칙. */
function Requirement({ met, label }: { met: boolean; label: string }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Icon name={met ? 'check' : 'minus'} size={theme.fontBody - 3} color={met ? colors.success : colors.textMuted} strokeWidth={3} />
      <Text style={{ fontSize: theme.fontBody - 3, color: met ? colors.success : colors.textMuted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  checklist: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  errorBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  successBadge: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
});
