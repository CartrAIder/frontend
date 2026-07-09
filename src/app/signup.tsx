import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ModeContext';

/** 회원가입 화면 — 이름·이메일·비밀번호로 가입하면 바로 로그인되어 카트 연결로 넘어간다. */
export default function SignupScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signup({ name, email, password });
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : '회원가입에 실패했어요. 다시 시도해주세요.');
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
          <View style={styles.header}>
            <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.text }]}>회원가입</Text>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted, lineHeight: 22 }}>
              CartrAIder 계정을 만들어{'\n'}스마트 쇼핑을 시작하세요
            </Text>
          </View>

          <View style={{ gap: theme.spacing }}>
            <TextField label="이름" value={name} onChangeText={setName} placeholder="홍길동" autoCapitalize="words" />
            <TextField
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <TextField
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={handleSignup}
            />

            {error && (
              <Text style={{ fontSize: theme.fontBody - 2, color: colors.danger }}>{error}</Text>
            )}

            <PrimaryButton
              title="가입하고 시작하기"
              onPress={handleSignup}
              loading={submitting}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: { gap: 8, marginTop: 16, marginBottom: 8 },
  title: { fontWeight: '800' },
  backButton: { paddingVertical: 12 },
});
