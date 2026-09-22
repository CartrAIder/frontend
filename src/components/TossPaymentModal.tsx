/**
 * 토스페이먼츠 결제창 — Expo Go에서 동작하도록 네이티브 SDK 대신 WebView로 토스 JS SDK를 띄운다.
 *
 * 흐름: 인라인 HTML이 클라이언트키로 토스를 초기화하고 requestPayment를 호출 → 사용자가 결제(테스트모드)
 * → 토스가 successUrl/failUrl로 리다이렉트 → 그 URL을 가로채 결과(paymentKey 등)를 부모에 전달한다.
 * (테스트키 test_ck_* 는 도메인 제약이 없어 인라인 HTML + 임의 baseUrl로 초기화된다.)
 */
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { useTheme } from '@/context/ModeContext';

/** 결제 성공/실패를 가로채기 위한 가짜 리다이렉트 URL(실제 이동 없이 인터셉트만 한다). */
const SUCCESS_URL = 'https://cartraider.pay/success';
const FAIL_URL = 'https://cartraider.pay/fail';

/** WebView가 직접 열어도 되는 주소. 나머지는 전부 앱 스킴으로 보고 OS에 넘긴다. */
function isWebUrl(url: string): boolean {
  return /^https?:/i.test(url) || url === 'about:blank' || url.startsWith('data:');
}

/**
 * 안드로이드 intent:// URL에서 필요한 조각을 뽑는다.
 *
 *   intent://pay?...#Intent;scheme=supertoss;package=viva.republica.toss;S.browser_fallback_url=https%3A%2F%2F...;end
 *
 * RN의 Linking은 intent:// 를 그대로 열지 못하므로 scheme으로 원래 앱 주소를 복원하고,
 * 앱이 없을 때를 대비해 fallback URL과 패키지명(스토어 이동용)도 같이 읽어둔다.
 */
function parseIntentUrl(url: string): {
  appUrl?: string;
  fallbackUrl?: string;
  packageName?: string;
} {
  const [body, fragment = ''] = url.slice('intent://'.length).split('#Intent;');
  const read = (key: string) => new RegExp(`(?:^|;)${key}=([^;]*)`).exec(fragment)?.[1];

  const scheme = read('scheme');
  const rawFallback = read('S.browser_fallback_url');
  return {
    appUrl: scheme ? `${scheme}://${body}` : undefined,
    fallbackUrl: rawFallback ? decodeURIComponent(rawFallback) : undefined,
    packageName: read('package'),
  };
}

/**
 * 결제 앱(토스·카드사 앱 등)으로 넘긴다.
 *
 * 간편결제를 고르면 결제창이 `intent://`·`supertoss://` 같은 앱 스킴으로 이동을 시도하는데,
 * WebView는 이런 스킴을 모르기 때문에 그냥 두면 ERR_UNKNOWN_URL_SCHEME 으로 화면이 깨진다.
 * 앱이 깔려 있으면 실행하고, 없으면 설치 페이지로 안내한다.
 */
async function openPaymentApp(url: string): Promise<void> {
  const intent = url.startsWith('intent://') ? parseIntentUrl(url) : null;
  const candidates = [intent ? intent.appUrl : url, intent?.fallbackUrl].filter(
    (candidate): candidate is string => Boolean(candidate),
  );

  for (const candidate of candidates) {
    try {
      await Linking.openURL(candidate);
      return;
    } catch {
      // 다음 후보로 넘어간다(앱 미설치 등).
    }
  }

  // 앱이 없을 때: 스토어로 보낸다. 패키지명을 모르면 안내만 한다.
  if (intent?.packageName) {
    for (const storeUrl of [
      `market://details?id=${intent.packageName}`,
      `https://play.google.com/store/apps/details?id=${intent.packageName}`,
    ]) {
      try {
        await Linking.openURL(storeUrl);
        return;
      } catch {
        // 스토어도 못 열면 아래 안내로 떨어진다.
      }
    }
  }

  Alert.alert(
    '결제 앱을 열 수 없어요',
    '선택한 간편결제 앱이 설치되어 있지 않습니다.\n설치 후 다시 시도하거나, 카드 직접 입력으로 결제해주세요.',
  );
}

export interface TossSuccess {
  paymentKey: string;
  orderId: string;
  amount: number;
}
export interface TossFail {
  code: string;
  message: string;
}

interface Props {
  visible: boolean;
  clientKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  customerName?: string;
  onSuccess: (result: TossSuccess) => void;
  onFail: (fail: TossFail) => void;
  onCancel: () => void;
}

function buildHtml(
  clientKey: string,
  orderId: string,
  orderName: string,
  amount: number,
  customerName?: string,
): string {
  // JS 문자열에 안전하게 넣기 위해 JSON.stringify로 이스케이프한다.
  const j = (v: string | number) => JSON.stringify(v);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://js.tosspayments.com/v1/payment"></script>
</head>
<body style="margin:0;background:#fff;">
  <script>
    function notifyFail(code, message) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fail', code: code, message: message }));
      }
    }
    try {
      var tossPayments = TossPayments(${j(clientKey)});
      tossPayments.requestPayment('카드', {
        amount: ${j(amount)},
        orderId: ${j(orderId)},
        orderName: ${j(orderName)},
        customerName: ${j(customerName ?? '')},
        successUrl: ${j(SUCCESS_URL)},
        failUrl: ${j(FAIL_URL)},
      }).catch(function (error) {
        // 사용자가 결제창을 닫으면 code: 'USER_CANCEL'
        notifyFail(error.code || 'UNKNOWN', error.message || '결제가 취소되었습니다.');
      });
    } catch (e) {
      notifyFail('SDK_INIT_ERROR', (e && e.message) || '결제 모듈 초기화에 실패했습니다.');
    }
  </script>
</body>
</html>`;
}

/** 리다이렉트 URL의 쿼리스트링을 파싱한다(URLSearchParams가 RN에 없을 수 있어 수동 파싱). */
function parseQuery(url: string): Record<string, string> {
  const q = url.split('?')[1] ?? '';
  const out: Record<string, string> = {};
  for (const pair of q.split('&')) {
    if (!pair) continue;
    const [k, v] = pair.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  return out;
}

export function TossPaymentModal({
  visible,
  clientKey,
  orderId,
  orderName,
  amount,
  customerName,
  onSuccess,
  onFail,
  onCancel,
}: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const html = useMemo(
    () => buildHtml(clientKey, orderId, orderName, amount, customerName),
    [clientKey, orderId, orderName, amount, customerName],
  );

  /** successUrl/failUrl 리다이렉트를 가로채 결과를 전달하고, 실제 페이지 이동은 막는다. */
  function handleShouldStart(request: { url: string }): boolean {
    const { url } = request;
    if (url.startsWith(SUCCESS_URL)) {
      const q = parseQuery(url);
      onSuccess({ paymentKey: q.paymentKey, orderId: q.orderId, amount: Number(q.amount) });
      return false;
    }
    if (url.startsWith(FAIL_URL)) {
      const q = parseQuery(url);
      onFail({ code: q.code || 'UNKNOWN', message: q.message || '결제에 실패했습니다.' });
      return false;
    }
    // 앱 스킴(intent://·supertoss://·ispmobile:// 등)은 WebView가 열 수 없다 → OS로 넘긴다.
    if (!isWebUrl(url)) {
      openPaymentApp(url);
      return false;
    }
    return true;
  }

  /** SDK가 postMessage로 보낸 실패(취소 포함)를 처리한다. */
  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'fail') {
        onFail({ code: data.code || 'UNKNOWN', message: data.message || '결제에 실패했습니다.' });
      }
    } catch {
      // 무시 — 예상치 못한 메시지
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      presentationStyle="fullScreen"
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <View
          style={[styles.header, { borderBottomColor: colors.border, minHeight: theme.minTouch }]}
        >
          <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>
            결제
          </Text>
          <Pressable onPress={onCancel} hitSlop={16} style={styles.close}>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>닫기</Text>
          </Pressable>
        </View>
        {visible && (
          <WebView
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://cartraider.pay' }}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={handleShouldStart}
            onMessage={handleMessage}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 12, color: colors.textMuted, fontSize: theme.fontBody }}>
                  결제창을 여는 중…
                </Text>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  close: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
