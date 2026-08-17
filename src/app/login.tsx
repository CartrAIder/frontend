import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Image,
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

import { ModeToggle } from '@/components/ModeToggle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ModeContext';
import { isEmailValid } from '@/lib/api';

/** 로그인 화면 — 앱의 진짜 첫 화면. 이메일·비밀번호로 회원 로그인 후 카트 연결로 넘어간다. */
export default function LoginScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const emailInvalid = email.length > 0 && !isEmailValid(email);

  async function handleLogin() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했어요. 다시 시도해주세요.');
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { padding: 24, gap: theme.spacing }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
              <Image
                source={require('../../assets/logo/mark-white-512.png')}
                style={styles.logoMark}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.appName, { fontSize: theme.fontDisplay, color: colors.text }]}>
              CartrAIder
            </Text>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
              스캔하고, 담고, 바로 결제하는{'\n'}스마트 쇼핑
            </Text>
          </View>

          <View style={{ gap: theme.spacing }}>
            <TextField
              label="이메일"
              value={email}
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
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              submitBehavior="submit"
              error={emailInvalid ? '이메일 형식을 확인해주세요' : null}
              invalid={!!error}
            />
            <TextField
              ref={passwordRef}
              label="비밀번호"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError(null);
              }}
              placeholder="비밀번호"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              invalid={!!error}
            />

            {error && (
              <View style={[styles.errorBox, { borderColor: colors.danger }]}>
                <Text style={{ fontSize: theme.fontBody - 1, color: colors.danger, lineHeight: 20 }}>{error}</Text>
              </View>
            )}

            <PrimaryButton title="로그인" onPress={handleLogin} loading={submitting} style={{ marginTop: 4 }} />

            <Link href="/password-reset" asChild>
              <Pressable hitSlop={8} style={styles.forgotRow}>
                <Text style={{ fontSize: theme.fontBody - 1, color: colors.textMuted, fontWeight: '600' }}>
                  비밀번호를 잊으셨나요?
                </Text>
              </Pressable>
            </Link>

            <View style={styles.signupRow}>
              <Text style={{ fontSize: theme.fontBody - 1, color: colors.textMuted }}>
                아직 계정이 없으신가요?
              </Text>
              <Link href="/signup" asChild>
                <Pressable hitSlop={8}>
                  <Text style={{ fontSize: theme.fontBody - 1, color: colors.primary, fontWeight: '700' }}>
                    회원가입
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>

          <View style={styles.spacer} />
          <ModeToggle />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  brand: { alignItems: 'center', gap: 12, marginTop: 28, marginBottom: 20 },
  logoBadge: { width: 84, height: 84, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  logoMark: { width: 52, height: 52 },
  appName: { fontWeight: '800', letterSpacing: 0.3 },
  errorBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  forgotRow: { alignSelf: 'center', paddingVertical: 8 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6 },
  spacer: { flex: 1, minHeight: 16 },
});
