import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, type TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { AppBar } from '@/components/AppBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/context/ModeContext';
import {
  checkPassword,
  confirmPasswordResetCode,
  isEmailValid,
  isPasswordValid,
  PASSWORD_RULE_TEXT,
  resetPassword,
  sendPasswordResetCode,
} from '@/lib/api';

/** 인증번호 재발송 쿨다운(초) — 서버 password-reset.resend-cooldown(1분)과 맞춘다. */
const RESEND_COOLDOWN_SEC = 60;

/**
 * 인증번호 입력 허용 횟수.
 *
 * 주의: 이건 보안 장치가 아니라 UX 장치다. 서버는 인증번호가 틀려도 코드를 폐기하지 않고
 * 시도 횟수도 세지 않으므로, 앱을 거치지 않는 요청은 이 제한을 그냥 통과한다.
 * 실제 무차별 대입 차단은 서버에 시도 횟수 카운터가 들어가야 한다.
 */
const MAX_CODE_ATTEMPTS = 5;

/** 3단계: 이메일 입력 → 인증번호 확인 → 새 비밀번호 설정. */
type Step = 'email' | 'code' | 'password';

/**
 * 비밀번호 찾기(비로그인) 화면 — 로그인 화면에서 진입한다.
 *
 * 서버는 계정 존재 여부를 숨기려고 미가입 이메일에도 발송 성공을 반환하므로,
 * 이 화면도 "가입된 이메일이라면 보냈다"는 톤을 유지한다.
 */
export default function PasswordResetScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  /** 인증번호 확인으로 받은 1회용 재설정 토큰. */
  const [resetToken, setResetToken] = useState<string | null>(null);
  /** 재설정 토큰 남은 수명(초). 0이 되면 처음부터 다시 받아야 한다. */
  const [tokenLeft, setTokenLeft] = useState(0);
  /** 인증번호 재발송까지 남은 초. */
  const [resendIn, setResendIn] = useState(0);
  /** 현재 인증번호에 대한 실패 횟수 — MAX_CODE_ATTEMPTS에 닿으면 1단계로 되돌린다. */
  const [attempts, setAttempts] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const codeRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const passwordConfirmRef = useRef<TextInput>(null);

  // 재발송 쿨다운 카운트다운
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // 재설정 토큰 만료 카운트다운 — 0이 되면 1단계로 되돌린다(만료된 토큰으로 요청해봐야 400).
  useEffect(() => {
    if (step !== 'password' || tokenLeft <= 0) return;
    const t = setTimeout(() => setTokenLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, tokenLeft]);

  useEffect(() => {
    if (step === 'password' && tokenLeft === 0 && resetToken) {
      setResetToken(null);
      setStep('email');
      setCode('');
      setPassword('');
      setPasswordConfirm('');
      setNotice(null);
      setError('입력 시간이 지났어요. 인증번호를 다시 받아주세요.');
    }
  }, [step, tokenLeft, resetToken]);

  const emailOk = isEmailValid(email);
  const pwChecks = checkPassword(password);
  const pwValid = isPasswordValid(password);
  const pwMatch = passwordConfirm.length > 0 && password === passwordConfirm;
  const confirmError =
    passwordConfirm.length > 0 && password !== passwordConfirm
      ? '비밀번호가 일치하지 않아요'
      : null;

  /** 1단계 — 인증번호 발송(최초/재발송 공용). */
  async function handleSendCode() {
    if (submitting || !emailOk || resendIn > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await sendPasswordResetCode(email);
      setStep('code');
      setAttempts(0); // 새 코드를 받으면 실패 횟수도 초기화
      setResendIn(RESEND_COOLDOWN_SEC);
      setNotice('가입된 이메일이라면 인증번호를 보냈어요. 10분 안에 입력해주세요.');
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '인증번호 발송에 실패했어요. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  /** 2단계 — 인증번호 확인 후 재설정 토큰 발급. */
  async function handleConfirmCode() {
    if (submitting || code.trim().length !== 6) return;
    setSubmitting(true);
    setError(null);
    try {
      const issued = await confirmPasswordResetCode(email, code);
      setResetToken(issued.resetToken);
      // expiresIn이 비거나 0이면 타이머가 즉시 만료로 판정해 1단계로 튕기므로 기본값으로 받친다.
      setTokenLeft(issued.expiresIn > 0 ? issued.expiresIn : 300);
      setStep('password');
      setNotice(null);
      setResendIn(0);
      setTimeout(() => passwordRef.current?.focus(), 100);
    } catch (e) {
      const message = e instanceof Error ? e.message : '인증에 실패했어요. 다시 시도해주세요.';
      const used = attempts + 1;
      setAttempts(used);

      if (used >= MAX_CODE_ATTEMPTS) {
        // 입력칸을 계속 두면 무한히 찍어볼 수 있으니 1단계로 되돌려 재발송을 강제한다.
        setStep('email');
        setCode('');
        setNotice(null);
        setError(`인증번호를 ${MAX_CODE_ATTEMPTS}번 잘못 입력했어요. 인증번호를 다시 받아주세요.`);
      } else {
        setError(`${message} (${MAX_CODE_ATTEMPTS - used}번 남음)`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  /** 3단계 — 새 비밀번호 설정. */
  async function handleResetPassword() {
    if (submitting || !resetToken || !pwValid || !pwMatch) return;
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(resetToken, password);
      setSucceeded(true);
      setTimeout(() => router.replace('/login'), 1500);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '비밀번호 변경에 실패했어요. 다시 시도해주세요.';
      // 토큰 만료·재사용이면 처음부터 다시 받아야 한다.
      setResetToken(null);
      setStep('email');
      setCode('');
      setError(message);
      setSubmitting(false);
    }
  }

  // ── 완료 화면 ────────────────────────────────────────────────────────
  if (succeeded) {
    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: colors.background }]}
      >
        <View style={[styles.successBadge, { backgroundColor: colors.successSurface }]}>
          <Icon name="check" size={44} color={colors.success} strokeWidth={3.2} />
        </View>
        <Text
          style={{
            fontSize: theme.fontTitle,
            color: colors.text,
            fontWeight: '800',
            marginTop: 20,
          }}
        >
          비밀번호를 바꿨어요
        </Text>
        <Text
          style={{
            fontSize: theme.fontBody,
            color: colors.textMuted,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          새 비밀번호로 로그인해주세요 · 잠시만요…
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
        <View style={{ gap: 8, marginTop: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: theme.fontTitle, color: colors.text, fontWeight: '800' }}>
            비밀번호 찾기
          </Text>
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, lineHeight: 22 }}>
            {step === 'email' && '가입한 이메일로 인증번호를 보내드려요.'}
            {step === 'code' && '메일로 받은 인증번호 6자리를 입력해주세요.'}
            {step === 'password' && '새로 사용할 비밀번호를 입력해주세요.'}
          </Text>
        </View>

        <StepIndicator step={step} />

        {/* ── 1단계: 이메일 ── */}
        <TextField
          label="이메일"
          value={email}
          editable={step === 'email'}
          onChangeText={(t) => {
            setEmail(t);
            if (error) setError(null);
          }}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="done"
          onSubmitEditing={handleSendCode}
          error={
            email.length > 0 && !emailOk ? '이메일 형식을 확인해주세요 (예: you@example.com)' : null
          }
        />

        {step === 'email' && (
          <PrimaryButton
            title="인증번호 받기"
            onPress={handleSendCode}
            loading={submitting}
            disabled={!emailOk}
          />
        )}

        {/* ── 2단계: 인증번호 ── */}
        {step === 'code' && (
          <View style={{ gap: 8 }}>
            {notice && (
              <Text
                style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, lineHeight: 20 }}
              >
                {notice}
              </Text>
            )}
            <View style={styles.codeRow}>
              <View style={styles.flex}>
                <TextField
                  ref={codeRef}
                  value={code}
                  onChangeText={(t) => {
                    setCode(t.replace(/[^0-9]/g, '').slice(0, 6));
                    if (error) setError(null);
                  }}
                  placeholder="인증번호 6자리"
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleConfirmCode}
                />
              </View>
              <PrimaryButton
                title="확인"
                onPress={handleConfirmCode}
                loading={submitting}
                disabled={code.trim().length !== 6}
                style={styles.confirmBtn}
              />
            </View>
            <Pressable
              onPress={handleSendCode}
              disabled={resendIn > 0 || submitting}
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

        {/* ── 3단계: 새 비밀번호 ── */}
        {step === 'password' && (
          <View style={{ gap: theme.spacing }}>
            <View
              style={[
                styles.timerBox,
                { backgroundColor: colors.primarySurface, borderRadius: theme.radiusSm },
              ]}
            >
              <Text
                style={{ fontSize: theme.fontBody - 2, color: colors.primary, fontWeight: '700' }}
              >
                남은 시간 {formatLeft(tokenLeft)}
              </Text>
            </View>

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
              />
              <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>
                {PASSWORD_RULE_TEXT}
              </Text>
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
              onSubmitEditing={handleResetPassword}
              error={confirmError}
            />

            <PrimaryButton
              title="비밀번호 변경하기"
              onPress={handleResetPassword}
              loading={submitting}
              disabled={!pwValid || !pwMatch}
            />
          </View>
        )}

        {error && (
          <View style={[styles.errorBox, { borderColor: colors.danger }]}>
            <Text style={{ fontSize: theme.fontBody - 1, color: colors.danger, lineHeight: 20 }}>
              {error}
            </Text>
          </View>
        )}

        <Pressable
          onPress={() => router.back()}
          disabled={submitting}
          style={styles.backButton}
          hitSlop={8}
        >
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center' }}>
            비밀번호가 기억났어요 ·{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>로그인</Text>
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

/** 남은 초를 m:ss로. */
function formatLeft(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 3단계 진행 표시 — 현재 단계는 파랑, 지나온 단계는 초록 체크. */
function StepIndicator({ step }: { step: Step }) {
  const theme = useTheme();
  const { colors } = theme;
  const order: Step[] = ['email', 'code', 'password'];
  const labels: Record<Step, string> = {
    email: '이메일',
    code: '인증번호',
    password: '새 비밀번호',
  };
  const currentIndex = order.indexOf(step);

  return (
    <View style={styles.stepRow}>
      {order.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const tone = done ? colors.success : active ? colors.primary : colors.textMuted;
        return (
          <View key={s} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                { borderColor: tone, backgroundColor: done || active ? tone : 'transparent' },
              ]}
            >
              {done ? (
                <Icon
                  name="check"
                  size={theme.fontBody - 4}
                  color={colors.card}
                  strokeWidth={3.4}
                />
              ) : (
                <Text
                  style={{ fontSize: theme.fontBody - 5, color: colors.card, fontWeight: '800' }}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              style={{
                fontSize: theme.fontBody - 4,
                color: tone,
                fontWeight: active ? '800' : '600',
              }}
            >
              {labels[s]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** 비밀번호 조건 한 칸 — 회원가입 화면과 같은 표시 규칙. */
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  confirmBtn: { paddingHorizontal: 22 },
  resend: { alignSelf: 'flex-start', paddingVertical: 4 },
  checklist: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  errorBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  backButton: { paddingVertical: 12 },
  timerBox: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6 },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
