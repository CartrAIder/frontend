import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { AppBar } from '@/components/AppBar';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useCatalog } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';

/** 관리자 상품 관리 — 목록·검색·재고 빠른 조절·수정·삭제. */
export default function AdminProductsScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { products, findZone, updateProduct, removeProduct } = useCatalog();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q) || p.id.includes(q),
    );
  }, [products, query]);

  /**
   * 재고 변경. 0을 넘나들면 서버 판매상태까지 바뀌므로 실패를 반드시 알린다
   * (조용히 넘기면 화면은 품절인데 서버는 판매중이라 주문이 계속 들어온다).
   */
  async function handleStock(productId: string, nextStock: number) {
    try {
      await updateProduct(productId, { stock: nextStock });
    } catch (e) {
      Alert.alert('재고 변경 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요.');
    }
  }

  function confirmDelete(productId: string, name: string) {
    Alert.alert('상품 삭제', `"${name}"을(를) 목록에서 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeProduct(productId) },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <AppBar title="상품 관리" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: theme.spacing }} keyboardShouldPersistTaps="handled">
        <PrimaryButton title="새 상품 등록" onPress={() => router.push('/admin/product-form')} />

        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderRadius: theme.radiusSm, minHeight: theme.minTouch }]}>
          <Icon name="search" size={theme.fontBody + 2} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="상품명·브랜드·ID로 검색"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, fontSize: theme.fontBody, color: colors.text, paddingVertical: 12 }}
          />
        </View>

        <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted, marginLeft: 4 }}>
          총 {filtered.length}개
        </Text>

        {filtered.map((product) => {
          const zone = findZone(product.zone);
          const soldOut = product.stock === 0;
          return (
            <Card key={product.id} style={{ gap: 10 }}>
              <View style={styles.head}>
                <Text style={{ fontSize: 26 }}>{product.icon}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={{ fontSize: theme.fontBody - 5, color: colors.textMuted }} numberOfLines={1}>
                    {product.id} · {zone ? `${zone.icon} ${zone.label}` : '⚠️ 구역 미지정'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }}>
                    ₩{product.unitPrice.toLocaleString('ko-KR')}
                  </Text>
                  {product.discountPercent ? (
                    <View style={[styles.tag, { backgroundColor: colors.warningSurface, borderRadius: 6 }]}>
                      <Text style={{ fontSize: theme.fontBody - 6, color: colors.warningText, fontWeight: '800' }}>
                        {product.discountPercent}% 할인
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* 재고 빠른 조절 — 목록에서 바로 재고만 고칠 수 있게 */}
              <View style={[styles.stockRow, { backgroundColor: colors.surface, borderRadius: theme.radiusSm }]}>
                <Text style={{ flex: 1, fontSize: theme.fontBody - 2, color: colors.textMuted, fontWeight: '700' }}>
                  재고
                </Text>
                <StepButton
                  label="−"
                  onPress={() => void handleStock(product.id, Math.max(0, product.stock - 1))}
                  disabled={product.stock === 0}
                />
                <Text
                  style={{
                    fontSize: theme.fontBody,
                    color: soldOut ? colors.danger : colors.text,
                    fontWeight: '800',
                    minWidth: 44,
                    textAlign: 'center',
                  }}
                >
                  {soldOut ? '품절' : product.stock}
                </Text>
                <StepButton label="+" onPress={() => void handleStock(product.id, product.stock + 1)} />
              </View>

              <View style={styles.actionRow}>
                <ActionButton
                  icon="settings"
                  label="수정"
                  onPress={() => router.push(`/admin/product-form?id=${product.id}`)}
                  color={colors.primary}
                />
                <ActionButton
                  icon="trash"
                  label="삭제"
                  onPress={() => confirmDelete(product.id, product.name)}
                  color={colors.danger}
                />
              </View>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: theme.fontBody, color: colors.textMuted }}>검색 결과가 없어요.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StepButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label === '+' ? '재고 1 증가' : '재고 1 감소'}
      style={[
        styles.stepButton,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: theme.radiusSm,
          minHeight: theme.minTouch - 8,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Text style={{ fontSize: theme.fontButton, color: colors.text, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  color,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  color: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionButton,
        { borderColor: color, borderRadius: theme.radiusSm, minHeight: theme.minTouch - 6 },
      ]}
    >
      <Icon name={icon} size={theme.fontBody} color={color} />
      <Text style={{ fontSize: theme.fontBody - 1, color, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tag: { paddingHorizontal: 6, paddingVertical: 2 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  stepButton: { width: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, flexDirection: 'row', gap: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  empty: { paddingVertical: 40, alignItems: 'center' },
});
