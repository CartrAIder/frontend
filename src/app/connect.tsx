import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useCartSession } from '@/context/CartSessionContext';
import { useTheme } from '@/context/ModeContext';

/** 카메라 프리뷰 위에 얹는 스캐너 조준 프레임(네 모서리 브래킷). */
function ScanCorners({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.corner, styles.cornerTL, { borderColor: color }]} />
      <View style={[styles.corner, styles.cornerTR, { borderColor: color }]} />
      <View style={[styles.corner, styles.cornerBL, { borderColor: color }]} />
      <View style={[styles.corner, styles.cornerBR, { borderColor: color }]} />
    </View>
  );
}

/** (1) 카트 연결 화면 — 로그인 후, QR 스캔 또는 코드 직접 입력으로 카트 세션을 연결한다. */
export default function CartConnectScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { connect } = useCartSession();

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
      await connect(rawCode);
      router.replace('/cart');
    } catch (e) {
      setError(e instanceof Error ? e.message: '연결에 실패했어요. 코드를 확인하고 다시 시도해주세요.');
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 6, alignItems: 'center' }}>
            <Text style={[styles.title, { fontSize: theme.fontTitle, color: colors.text }]}>카트 연결하기</Text>
            <Text style={[styles.desc, { fontSize: theme.fontBody, color: colors.textMuted }]}>
              {manualMode ? '카트에 적힌 코드를 입력해주세요' : '카트에 붙어있는 QR코드를 스캔해주세요'}
            </Text>
          </View>

          {/* 직접 입력 모드에서는 카메라 박스를 숨겨 입력창이 키보드에 가리지 않게 한다. */}
          {!manualMode && (
            <View style={[styles.qrBox, { borderRadius: theme.radius, backgroundColor: '#0B1220' }]}>
              {permission?.granted ? (
                <>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  />
                  <ScanCorners color="#FFFFFF" />
                </>
              ) : (
                <View style={[styles.cameraFallback, { gap: theme.spacing }]}>
                  <Text style={{ fontSize: theme.fontBody, color: '#E5E7EB', textAlign: 'center' }}>
                    카트 QR을 스캔하려면{'\n'}카메라 권한이 필요해요
                  </Text>
                  <Pressable
                    onPress={requestPermission}
                    style={[styles.permButton, { borderColor: '#FFFFFF', minHeight: theme.minTouch, borderRadius: theme.radiusSm }]}
                  >
                    <Text style={{ fontSize: theme.fontButton, color: '#FFFFFF', fontWeight: '600' }}>카메라 권한 허용</Text>
                  </Pressable>
                  <ScanCorners color="#4B5563" />
                </View>
              )}
            </View>
          )}

          {manualMode ? (
            <View style={{ gap: theme.spacing }}>
              <TextField
                value={code}
                onChangeText={setCode}
                placeholder="카트 코드 입력 (예: cart_001)"
                autoCapitalize="none" // 대문자화 방지
                autoCorrect={false}
                autoFocus
              />
              <PrimaryButton title="연결하기" onPress={() => handleConnect(code)} loading={connecting} />
              <Pressable onPress={() => setManualMode(false)} disabled={connecting} hitSlop={8} style={styles.linkRow}>
                <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>QR 스캔으로 돌아가기</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setManualMode(true)}
              style={[styles.secondaryButton, { backgroundColor: colors.primarySurface, minHeight: theme.minTouch, borderRadius: theme.radiusSm }]}
            >
              <Text style={{ fontSize: theme.fontButton, color: colors.primary, fontWeight: '700' }}>
                ⌨️  직접 코드 입력하기
              </Text>
            </Pressable>
          )}

          {error && (
            <Text style={{ fontSize: theme.fontBody, color: colors.danger, textAlign: 'center' }}>{error}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  body: { flexGrow: 1, justifyContent: 'center', gap: 20, paddingVertical: 16 },
  title: { fontWeight: '800', textAlign: 'center' },
  desc: { textAlign: 'center', lineHeight: 24 },
  qrBox: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 300,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  cameraFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  permButton: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  secondaryButton: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  linkRow: { alignItems: 'center', paddingVertical: 8 },
  corner: { position: 'absolute', width: 34, height: 34 },
  cornerTL: { top: 18, left: 18, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  cornerTR: { top: 18, right: 18, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  cornerBL: { bottom: 18, left: 18, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: 18, right: 18, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
});
