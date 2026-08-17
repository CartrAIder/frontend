import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { ProductImage } from '@/components/ProductImage';
import { AppBar } from '@/components/AppBar';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useCatalog, type ProductDraft } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';
import type { Product } from '@/lib/mock/products';


/**
 * 상품 등록 / 수정 폼.
 * `?id=` 없으면 신규 등록, 있으면 해당 상품 수정. 저장은 CatalogContext(→ secure-store).
 */
export default function AdminProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { findProduct, isRestoring } = useCatalog();

  // 폼 초기값은 마운트 시 한 번만 잡히므로, 수정 모드로 딥링크 진입했을 때는
  // 카탈로그 복원이 끝난 뒤에 폼을 마운트한다.
  if (id && isRestoring) return null;

  return <ProductForm editing={id ? findProduct(id) : undefined} />;
}

function ProductForm({ editing }: { editing?: Product }) {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const navigation = useNavigation();
  const { shelfZones, createProduct, editProduct } = useCatalog();

  const isEdit = Boolean(editing);

  const [name, setName] = useState(editing?.name ?? '');
  const [barcode, setBarcode] = useState('');
  const [brand, setBrand] = useState(editing?.brand ?? '');
  const [price, setPrice] = useState(editing ? String(editing.unitPrice) : '');
  const [stock, setStock] = useState(editing ? String(editing.stock) : '0');
  const [discount, setDiscount] = useState(editing?.discountPercent ? String(editing.discountPercent) : '');
  const [description, setDescription] = useState(editing?.description ?? '');
  // 대표 이미지는 상품명으로 자동 생성한다(ProductImage). icon 필드는 하위 호환용으로만 남긴다.
  const icon = editing?.icon ?? '';
  const [zone, setZone] = useState(editing?.zone ?? shelfZones[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? '상품 수정' : '새 상품 등록' });
  }, [navigation, isEdit]);

  async function handleSave() {
    if (submitting) return;
    const trimmedName = name.trim();
    const trimmedBarcode = barcode.trim();
    const parsedPrice = Number(price.replace(/[^0-9]/g, ''));
    const parsedStock = Number(stock.replace(/[^0-9]/g, ''));
    const parsedDiscount = discount.trim() ? Number(discount.replace(/[^0-9]/g, '')) : 0;

    if (!trimmedName) return setError('상품명을 입력해주세요.');
    if (!isEdit && !trimmedBarcode) return setError('바코드를 입력해주세요.');
    if (!parsedPrice || parsedPrice <= 0) return setError('판매 가격을 숫자로 입력해주세요.');
    if (parsedDiscount < 0 || parsedDiscount > 90) return setError('할인율은 0~90 사이로 입력해주세요.');
    if (!zone) return setError('매장 구역을 선택해주세요.');

    const draft: ProductDraft = {
      name: trimmedName,
      brand: brand.trim() || undefined,
      unitPrice: parsedPrice,
      stock: Number.isFinite(parsedStock) ? parsedStock : 0,
      discountPercent: parsedDiscount > 0 ? parsedDiscount : undefined,
      description: description.trim() || undefined,
      icon,
      zone,
    };

    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await editProduct(editing.id, draft);
      } else {
        await createProduct(draft, trimmedBarcode);
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했어요. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <AppBar title="상품 등록" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: theme.spacing }} keyboardShouldPersistTaps="handled">
          {/* 미리보기 */}
          <Card style={styles.preview}>
            <View style={[styles.previewThumb, { backgroundColor: colors.surface, borderRadius: theme.radiusSm }]}>
              <ProductImage id={editing?.id ?? name} name={name} zone={zone} size={56} radius={theme.imageRadius} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }} numberOfLines={1}>
                {name.trim() || '상품명 미입력'}
              </Text>
              <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }} numberOfLines={1}>
                {brand.trim() || '브랜드 없음'} · {shelfZones.find((z) => z.id === zone)?.label ?? '구역 미선택'}
              </Text>
              <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }}>
                ₩{(Number(price.replace(/[^0-9]/g, '')) || 0).toLocaleString('ko-KR')}
              </Text>
            </View>
          </Card>

          {/* 기본 정보 */}
          <Card style={{ gap: theme.spacing }}>
            <TextField label="상품명 *" value={name} onChangeText={setName} placeholder="예) 서울우유 1L" />
            {isEdit ? (
              <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>
                바코드 {editing?.id} · 이름·카테고리는 서버에서 변경되지 않아요(가격·재고·표시만 반영).
              </Text>
            ) : (
              <TextField
                label="바코드 *"
                value={barcode}
                onChangeText={setBarcode}
                placeholder="예) 8801234567999"
                keyboardType="number-pad"
              />
            )}
            <TextField label="브랜드" value={brand} onChangeText={setBrand} placeholder="예) 서울우유" />
            <TextField
              label="판매 가격 (원) *"
              value={price}
              onChangeText={setPrice}
              placeholder="2400"
              keyboardType="number-pad"
            />
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <TextField label="재고 수량" value={stock} onChangeText={setStock} placeholder="0" keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="할인율 (%)"
                  value={discount}
                  onChangeText={setDiscount}
                  placeholder="없으면 비워두기"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <TextField
              label="상품 설명"
              value={description}
              onChangeText={setDescription}
              placeholder="상세 화면에 보여줄 한 줄 소개"
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </Card>

          {/* 매장 구역 */}
          <Card style={{ gap: 10 }}>
            <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}>매장 구역 *</Text>
            <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>
              선택한 구역이 지도·길 안내의 목적지가 됩니다.
            </Text>
            <View style={styles.zoneGrid}>
              {shelfZones.map((z) => {
                const active = zone === z.id;
                return (
                  <Pressable
                    key={z.id}
                    onPress={() => setZone(z.id)}
                    style={[
                      styles.zoneChip,
                      {
                        backgroundColor: active ? colors.primary : z.color,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: theme.radiusSm,
                        minHeight: theme.minTouch,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 18 }}>{z.icon}</Text>
                    <Text
                      style={{
                        fontSize: theme.fontBody - 3,
                        color: active ? colors.primaryText : '#1F2937',
                        fontWeight: '700',
                      }}
                      numberOfLines={1}
                    >
                      {z.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {error && <Text style={{ fontSize: theme.fontBody - 2, color: colors.danger }}>{error}</Text>}

          <PrimaryButton
            title={isEdit ? '수정 저장' : '상품 등록'}
            onPress={handleSave}
            loading={submitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewThumb: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  twoCol: { flexDirection: 'row', gap: 10 },
  zoneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zoneChip: {
    flexGrow: 1,
    flexBasis: '30%',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 2,
  },
});
