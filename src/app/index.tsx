import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModeToggle } from '@/components/ModeToggle';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ModeContext';

/** (1) 카트 연결 화면 — QR 스캔 또는 코드 직접 입력으로 카트 세션을 연결한다. */
export default function CartConnectScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { login } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [manualMode, setManualMode] = useState(false);
  const [code, setCode] = useState('');
  const [scanned, setScanned] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted, permission?.canAskAgain]);

  async function handleConnect(rawCode: string) {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    try {
      await login(rawCode);
      router.replace('/cart');
    } catch {
      setError('연결에 실패했어요. 코드를 확인하고 다시 시도해주세요.');
      setScanned(false);
      setConnecting(false);
    }
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanned || connecting) return;
    setScanned(true);
    handleConnect(result.data);
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <View style={styles.body}>
        <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.text }]}>
          카트 연결하기
        </Text>
        <Text style={[styles.desc, { fontSize: theme.fontBody, color: colors.textMuted }]}>
          카트에 붙어있는 QR코드를 스캔해주세요
        </Text>

        <View style={[styles.qrBox, { borderColor: colors.border }]}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
          ) : (
            <View style={[styles.cameraFallback, { gap: theme.spacing }]}>
              <Text
                style={{ fontSize: theme.fontBody, color: colors.textMuted, textAlign: 'center' }}
              >
                카트 QR을 스캔하려면{'\n'}카메라 권한이 필요해요
              </Text>
              <Pressable
                onPress={requestPermission}
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.primary, minHeight: theme.minTouch },
                ]}
              >
                <Text style={{ fontSize: theme.fontButton, color: colors.primary }}>
                  카메라 권한 허용
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>또는</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {manualMode ? (
          <View style={[styles.manualCard, { gap: theme.spacing }]}>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="카트 코드 입력 (예: A12)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  fontSize: theme.fontBody,
                  color: colors.text,
                  borderColor: colors.border,
                  minHeight: theme.minTouch,
                },
              ]}
            />
            <Pressable
              onPress={() => handleConnect(code)}
              disabled={connecting}
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary, minHeight: theme.minTouch },
              ]}
            >
              {connecting ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text
                  style={{ fontSize: theme.fontButton, color: colors.primaryText, fontWeight: '700' }}
                >
                  확인
                </Text>
              )}
            </Pressable>
            <Pressable onPress={() => setManualMode(false)} disabled={connecting}>
              <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>취소</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setManualMode(true)}
            style={[
              styles.secondaryButton,
              { borderColor: colors.primary, minHeight: theme.minTouch },
            ]}
          >
            <Text style={{ fontSize: theme.fontButton, color: colors.primary, fontWeight: '600' }}>
              직접 코드 입력하기
            </Text>
          </Pressable>
        )}

        {error && (
          <Text style={{ fontSize: theme.fontBody, color: colors.warningText, textAlign: 'center' }}>
            {error}
          </Text>
        )}
      </View>

      <ModeToggle />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  body: { flex: 1, justifyContent: 'center', gap: 16 },
  title: { fontWeight: '700', textAlign: 'center' },
  desc: { textAlign: 'center', lineHeight: 26 },
  qrBox: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 280,
    alignSelf: 'center',
    borderWidth: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  secondaryButton: {
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  manualCard: { width: '100%' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  primaryButton: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
