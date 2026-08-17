import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ModeContext';
import { ORDER_STATUS_LABEL, type ApiOrderStatus } from '@/lib/api';

/** 주문 상태 배지 — 관리자 주문 목록·상세가 같은 색 규칙을 공유한다. */
export function OrderStatusBadge({ status }: { status: ApiOrderStatus }) {
  const theme = useTheme();
  const { colors } = theme;

  const tone: Record<ApiOrderStatus, { bg: string; fg: string }> = {
    PAID: { bg: colors.successSurface, fg: colors.success },
    PENDING_PAYMENT: { bg: colors.warningSurface, fg: colors.warningText },
    CANCELED: { bg: colors.surface, fg: colors.danger },
    EXPIRED: { bg: colors.surface, fg: colors.textMuted },
  };
  const { bg, fg } = tone[status];

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: 6 }]}>
      <Text style={{ fontSize: theme.fontBody - 5, color: fg, fontWeight: '800' }}>
        {ORDER_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3 },
});
