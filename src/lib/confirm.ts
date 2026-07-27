import { Alert, Platform } from 'react-native';

/**
 * 크로스플랫폼 확인 다이얼로그.
 * - 네이티브(폰): Alert.alert (취소/확인 2버튼)
 * - 웹: window.confirm (react-native-web의 Alert.alert는 다중 버튼 onPress가 동작하지 않음)
 *
 * 확인 시에만 onConfirm을 호출한다.
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  options: { confirmText?: string; destructive?: boolean } = {},
): void {
  const { confirmText = '확인', destructive = false } = options;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
