import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, type TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { AppBar } from '@/components/AppBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ModeContext';
import {
  checkPassword,
  confirmEmailVerification,
  isEmailValid,
  isPasswordValid,
  PASSWORD_RULE_TEXT,
  sendEmailVerification,
} from '@/lib/api';

/** 인증번호 재발송 쿨다운(초) — 서버 resend-cooldown(1분)과 맞춘다. */
const RESEND_COOLDOWN_SEC = 60;

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

  // ── 이메일 인증 단계 상태 ──
  const [codeSent, setCodeSent] = useState(false); // 인증번호 발송됨(=코드 입력칸 노출)
  const [emailVerified, setEmailVerified] = useState(false); // 인증 완료
  const [code, setCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null); // "인증번호를 보냈어요" 안내
  const [resendIn, setResendIn] = useState(0); // 재발송까지 남은 초

  // 다음 칸으로 포커스 이동용 ref
  const emailRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const passwordConfirmRef = useRef<TextInput>(null);

  // 재발송 쿨다운 카운트다운 (1초씩 감소)
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // 실시간 검증 상태
  const pwChecks = checkPassword(password);
  const emailOk = isEmailValid(email);
  const emailInvalid = email.length > 0 && !emailOk;
  const pwValid = isPasswordValid(password);
  const pwMatch = passwordConfirm.length > 0 && password === passwordConfirm;
  const formValid = name.trim().length > 0 && emailOk && emailVerified && pwValid && pwMatch;

  // 이메일 입력칸에 표시할 에러: 서버발(중복) 우선, 없으면 형식 안내
  const emailFieldError =
    emailError ?? (emailInvalid ? '이메일 형식을 확인해주세요 (예: you@example.com)' : null);
  // 비밀번호 확인 불일치 안내 (확인칸에 입력이 있고 다를 때만)
  const confirmError =
    passwordConfirm.length > 0 && password !== passwordConfirm
      ? '비밀번호가 일치하지 않아요'
      : null;

  /** 이메일을 수정하면 이전 인증 상태를 초기화한다(A로 인증 후 B로 가입 방지). */
  function resetVerification() {
    setCodeSent(false);
    setEmailVerified(false);
    setCode('');
    setCodeError(null);
    setVerifyMsg(null);
    setResendIn(0);
  }

  /** 인증번호 발송(최초/재발송 공용). */
  async function handleSendCode() {
    if (sendingCode || !emailOk || resendIn > 0) return;
    setSendingCode(true);
    setCodeError(null);
    setEmailError(null);
    try {
      await sendEmailVerification(email);
      setCodeSent(true);
      setResendIn(RESEND_COOLDOWN_SEC);
      setVerifyMsg('인증번호를 이메일로 보냈어요. 10분 안에 입력해주세요.');
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '인증번호 발송에 실패했어요. 잠시 후 다시 시도해주세요.';
      // 이미 가입된 이메일이면 이메일 칸에, 그 외(쿨다운·발송실패)는 코드 영역에 표시
      if (message.includes('이미') || message.includes('가입')) {
        setEmailError(message);
      } else {
        setCodeError(message);
      }
    } finally {
      setSendingCode(false);
    }
  }

  /** 인증번호 확인. */
  async function handleConfirmCode() {
    if (confirmingCode || code.trim().length !== 6) return;
    setConfirmingCode(true);
    setCodeError(null);
    try {
      await confirmEmailVerification(email, code);
      setEmailVerified(true);
      setCodeSent(false);
      setVerifyMsg(null);
      setResendIn(0);
      setTimeout(() => passwordRef.current?.focus(), 100);
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : '인증에 실패했어요. 다시 시도해주세요.');
    } finally {
      setConfirmingCode(false);
    }
  }

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
      // 인증 만료(30분 경과 등)면 인증 단계를 다시 밟도록 초기화
      if (message.includes('인증')) {
        resetVerification();
        setError(message);
      } else if (message.includes('이메일')) {
        // 중복 이메일은 이메일 입력칸에 빨간색으로
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
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: colors.background }]}
      >
        <View style={[styles.successBadge, { backgroundColor: colors.successSurface }]}>
          <Icon name="check" size={44} color={colors.success} strokeWidth={3.2} />
        </View>
        <Text
          style={[styles.title, { fontSize: theme.fontTitle, color: colors.text, marginTop: 20 }]}
        >
          가입 완료!
        </Text>
        <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, marginTop: 8 }}>
          환영해요, {name.trim()}님 · 잠시만요…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <AppBar />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={[styles.scroll, { padding: 24, gap: theme.spacing }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.text }]}>
            회원가입
          </Text>
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

          <View style={{ gap: 8 }}>
            <TextField
              ref={emailRef}
              label="이메일"
              value={email}
              editable={!emailVerified}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError(null); // 수정 시 서버 에러 해제
                if (codeSent || emailVerified) resetVerification(); // 이메일 바꾸면 인증 초기화
              }}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType={codeSent ? 'next' : 'done'}
              onSubmitEditing={() => (codeSent ? codeRef.current?.focus() : handleSendCode())}
              submitBehavior="submit"
              error={emailFieldError}
            />

            {emailVerified ? (
              // ── 인증 완료 ──
              <View style={styles.verifiedRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="check" size={theme.fontBody} color={colors.success} strokeWidth={3} />
                  <Text
                    style={{ fontSize: theme.fontBody, color: colors.success, fontWeight: '700' }}
                  >
                    이메일 인증 완료
                  </Text>
                </View>
                <Pressable onPress={resetVerification} hitSlop={8}>
                  <Text
                    style={{ fontSize: theme.fontBody, color: colors.primary, fontWeight: '600' }}
                  >
                    변경
                  </Text>
                </Pressable>
              </View>
            ) : !codeSent ? (
              // ── 인증번호 받기 ──
              <PrimaryButton
                title="인증번호 받기"
                variant="neutral"
                onPress={handleSendCode}
                loading={sendingCode}
                disabled={!emailOk}
              />
            ) : (
              // ── 인증번호 입력 ──
              <View style={{ gap: 8 }}>
                {verifyMsg && (
                  <Text
                    style={{
                      fontSize: theme.fontBody - 2,
                      color: colors.textMuted,
                      lineHeight: 20,
                    }}
                  >
                    {verifyMsg}
                  </Text>
                )}
                <View style={styles.codeRow}>
                  <View style={styles.flex}>
                    <TextField
                      ref={codeRef}
                      value={code}
                      onChangeText={(t) => {
                        setCode(t.replace(/[^0-9]/g, '').slice(0, 6));
                        if (codeError) setCodeError(null);
                      }}
                      placeholder="인증번호 6자리"
                      keyboardType="number-pad"
                      maxLength={6}
                      returnKeyType="done"
                      onSubmitEditing={handleConfirmCode}
                      error={codeError}
                    />
                  </View>
                  <PrimaryButton
                    title="확인"
                    onPress={handleConfirmCode}
                    loading={confirmingCode}
                    disabled={code.trim().length !== 6}
                    style={styles.confirmBtn}
                  />
                </View>
                <Pressable
                  onPress={handleSendCode}
                  disabled={resendIn > 0 || sendingCode}
                  hitSlop={8}
                  style={styles.resend}
                >
                  <Text
                    style={{
                      fontSize: theme.fontBody - 1,
                      color: resendIn > 0 ? colors.textMuted : colors.primary,
                      fontWeight: '600',
                    }}
                  >
                    {resendIn > 0 ? `인증번호 재발송 (${resendIn}초)` : '인증번호 재발송'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

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
            <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>
              {PASSWORD_RULE_TEXT}
            </Text>
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
              <Text style={{ fontSize: theme.fontBody - 1, color: colors.danger, lineHeight: 20 }}>
                {error}
              </Text>
            </View>
          )}

          <PrimaryButton
            title="가입하고 시작하기"
            onPress={handleSignup}
            loading={submitting}
            disabled={!formValid}
            style={{ marginTop: 4 }}
          />

          <Pressable
            onPress={() => router.back()}
            disabled={submitting}
            style={styles.backButton}
            hitSlop={8}
          >
            <Text
              style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center' }}
            >
              이미 계정이 있어요 ·{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>로그인</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

/** 비밀번호 조건 한 칸 — 충족 시 초록 체크, 미충족 시 회색 대시. */
function Requirement({ met, label }: { met: boolean; label: string }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Icon
        name={met ? 'check' : 'minus'}
        size={theme.fontBody - 3}
        color={met ? colors.success : colors.textMuted}
        strokeWidth={3}
      />
      <Text
        style={{ fontSize: theme.fontBody - 3, color: met ? colors.success : colors.textMuted }}
      >
        {label}
      </Text>
    </View>
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
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  codeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  confirmBtn: { paddingHorizontal: 22 },
  resend: { alignSelf: 'flex-start', paddingVertical: 4 },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
