import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ModeContext';
import { checkPassword, isEmailValid, isPasswordValid, PASSWORD_RULE_TEXT } from '@/lib/api';

/** 회원가입 화면 — 이름·이메일·비밀번호로 가입하면 바로 로그인되어 카트 연결로 넘어간다. */
export default function SignupScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null); // 서버발(중복 등) 이메일 에러

  // 다음 칸으로 포커스 이동용 ref
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const passwordConfirmRef = useRef<TextInput>(null);

  // 실시간 검증 상태
  const pwChecks = checkPassword(password);
  const emailOk = isEmailValid(email);
  const emailInvalid = email.length > 0 && !emailOk;
  const pwValid = isPasswordValid(password);
  const pwMatch = passwordConfirm.length > 0 && password === passwordConfirm;
  const formValid = name.trim().length > 0 && emailOk && pwValid && pwMatch;

  // 이메일 입력칸에 표시할 에러: 서버발(중복) 우선, 없으면 형식 안내
  const emailFieldError = emailError ?? (emailInvalid ? '이메일 형식을 확인해주세요 (예: you@example.com)' : null);
  // 비밀번호 확인 불일치 안내 (확인칸에 입력이 있고 다를 때만)
  const confirmError = passwordConfirm.length > 0 && password !== passwordConfirm ? '비밀번호가 일치하지 않아요' : null;

  async function handleSignup() {
    if (submitting || !formValid) return;
    setSubmitting(true);
    setError(null);
    setEmailError(null);
    try {
      await signup({ name, email, password });
      // 성공 UI를 잠깐 보여준 뒤 홈으로 이동
      setSucceeded(true);
      setTimeout(() => router.replace('/home'), 1200);
    } catch (e) {
      const message = e instanceof Error ? e.message : '회원가입에 실패했어요. 다시 시도해주세요.';
      // 중복 이메일은 이메일 입력칸에 빨간색으로, 그 외는 하단 에러 박스에 표시
      if (message.includes('이메일')) {
        setEmailError(message);
      } else {
        setError(message);
      }
      setSubmitting(false);
    }
  }

  // ── 회원가입 성공 화면 ──────────────────────────────────────────────
  if (succeeded) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.successBadge, { backgroundColor: colors.successSurface }]}>
          <Text style={{ fontSize: 44, color: colors.success, fontWeight: '800' }}>✓</Text>
        </View>
        <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.text, marginTop: 20 }]}>
          가입 완료!
        </Text>
        <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, marginTop: 8 }}>
          환영해요, {name.trim()}님 · 잠시만요…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { padding: 24, gap: theme.spacing }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.text }]}>회원가입</Text>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, lineHeight: 22 }}>
              CartrAIder 계정을 만들어{'\n'}스마트 쇼핑을 시작하세요
            </Text>
          </View>

          <View style={{ gap: theme.spacing }}>
            <TextField
              label="이름"
              value={name}
              onChangeText={setName}
              placeholder="홍길동"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              submitBehavior="submit"
            />

            <TextField
              ref={emailRef}
              label="이메일"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError(null); // 수정 시 서버 에러 해제
              }}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              submitBehavior="submit"
              error={emailFieldError}
            />

            <View style={{ gap: 8 }}>
              <TextField
                ref={passwordRef}
                label="비밀번호"
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => passwordConfirmRef.current?.focus()}
                submitBehavior="submit"
              />
              {/* 규칙 안내 (항상 표시) */}
              <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>{PASSWORD_RULE_TEXT}</Text>
              {/* 실시간 체크리스트 (입력 시작하면 표시) */}
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
              label="비밀번호 확인"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호 다시 입력"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSignup}
              error={confirmError}
            />

            {error && (
              <View style={[styles.errorBox, { borderColor: colors.danger }]}>
                <Text style={{ fontSize: theme.fontBody - 1, color: colors.danger, lineHeight: 20 }}>{error}</Text>
              </View>
            )}

            <PrimaryButton
              title="가입하고 시작하기"
              onPress={handleSignup}
              loading={submitting}
              disabled={!formValid}
              style={{ marginTop: 4 }}
            />

            <Pressable onPress={() => router.back()} disabled={submitting} style={styles.backButton} hitSlop={8}>
              <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center' }}>
                이미 계정이 있어요 · <Text style={{ color: colors.primary, fontWeight: '700' }}>로그인</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** 비밀번호 조건 한 칸 — 충족 시 초록 ✓, 미충족 시 회색 ○ */
function Requirement({ met, label }: { met: boolean; label: string }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <Text style={{ fontSize: theme.fontBody - 3, color: met ? colors.success : colors.textMuted }}>
      {met ? '✓' : '○'} {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { gap: 8, marginTop: 16, marginBottom: 8 },
  title: { fontWeight: '800' },
  backButton: { paddingVertical: 12 },
  checklist: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  errorBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
