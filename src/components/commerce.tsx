import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/Icon';
import { ProductImage } from '@/components/ProductImage';
import { useTheme } from '@/context/ModeContext';
import { formatWon } from '@/lib/format';

/**
 * 커머스 공통 UI 조각 — 상품 카드·가격·배지·검색바·섹션 헤더.
 *
 * 국내 쇼핑앱 관례를 따른다: 이미지가 먼저, 브랜드는 작은 회색, 상품명 2줄,
 * 가격은 굵게, 할인율은 가격 왼쪽에 빨강. 화면마다 다시 만들지 말고 여기서 가져다 쓴다.
 */

// ── 가격 ────────────────────────────────────────────────────────────────

/** 할인율 + 정가 취소선 + 판매가. 할인이 없으면 판매가만 굵게 보여준다. */
export function Price({
  price,
  original,
  discountPercent,
  size = 'md',
}: {
  price: number;
  original?: number;
  discountPercent?: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const theme = useTheme();
  const { colors } = theme;
  const base = size === 'lg' ? theme.fontAmount : size === 'sm' ? theme.fontBody - 1 : theme.fontBody + 1;

  return (
    <View style={{ gap: 1 }}>
      {discountPercent ? (
        <Text
          style={{ fontSize: base - 5, color: colors.textMuted, textDecorationLine: 'line-through' }}
          numberOfLines={1}
        >
          {formatWon(original ?? price)}
        </Text>
      ) : null}
      <View style={styles.priceRow}>
        {discountPercent ? (
          <Text style={{ fontSize: base, color: colors.discount, fontWeight: '800' }}>{discountPercent}%</Text>
        ) : null}
        <Text style={{ fontSize: base, color: colors.text, fontWeight: '800' }}>{formatWon(price)}</Text>
      </View>
    </View>
  );
}

// ── 배지 ────────────────────────────────────────────────────────────────

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'primary' | 'sale' | 'soldout';
}) {
  const theme = useTheme();
  const { colors } = theme;
  const tones = {
    neutral: { bg: colors.surface, fg: colors.textMuted },
    primary: { bg: colors.primarySurface, fg: colors.primary },
    sale: { bg: colors.discount, fg: '#FFFFFF' },
    soldout: { bg: colors.text, fg: '#FFFFFF' },
  } as const;
  const { bg, fg } = tones[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ fontSize: theme.fontBody - 5, color: fg, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

// ── 섹션 헤더 ────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  subtitle,
  onMore,
}: {
  title: string;
  subtitle?: string;
  onMore?: () => void;
}) {
  const theme = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: theme.fontButton - 1, color: colors.text, fontWeight: '800' }}>{title}</Text>
        {subtitle ? (
          <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>{subtitle}</Text>
        ) : null}
      </View>
      {onMore ? (
        <Pressable onPress={onMore} hitSlop={8} style={styles.moreButton} accessibilityLabel={`${title} 더보기`}>
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, fontWeight: '600' }}>더보기</Text>
          <Icon name="chevronRight" size={14} color={colors.textMuted} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ── 검색바 ───────────────────────────────────────────────────────────────

/** 눌러서 검색 화면으로 보내는 읽기 전용 바(홈용)와 실제 입력바(검색 화면용)를 겸한다. */
export function SearchBar({
  value,
  onChangeText,
  onPress,
  placeholder = '어떤 상품을 찾으세요?',
  autoFocus,
  onSubmitEditing,
}: {
  value?: string;
  onChangeText?: (t: string) => void;
  onPress?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const readOnly = !onChangeText;

  const inner = (
    <View
      style={[
        styles.searchBar,
        { backgroundColor: colors.surface, borderRadius: 999, minHeight: theme.minTouch },
      ]}
    >
      <Icon name="search" size={theme.fontBody + 4} color={colors.textMuted} />
      {readOnly ? (
        <Text style={{ flex: 1, fontSize: theme.fontBody, color: colors.textMuted }} numberOfLines={1}>
          {placeholder}
        </Text>
      ) : (
        <>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            autoFocus={autoFocus}
            returnKeyType="search"
            onSubmitEditing={onSubmitEditing}
            style={{ flex: 1, fontSize: theme.fontBody, color: colors.text, paddingVertical: 10 }}
          />
          {value ? (
            <Pressable onPress={() => onChangeText?.('')} hitSlop={10} accessibilityLabel="검색어 지우기">
              <Icon name="close" size={theme.fontBody + 2} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );

  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="search">
      {inner}
    </Pressable>
  ) : (
    inner
  );
}

// ── 칩 ──────────────────────────────────────────────────────────────────

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { colors } = theme;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.text : colors.card,
          borderColor: active ? colors.text : colors.border,
          minHeight: theme.minTouch - 10,
        },
      ]}
    >
      <Text
        style={{
          fontSize: theme.fontBody - 2,
          color: active ? colors.card : colors.textMuted,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── 상품 카드(그리드) ─────────────────────────────────────────────────────

export interface CardProduct {
  id: string;
  name: string;
  zone?: string;
  brand?: string;
  unitPrice: number;
  discountPercent?: number;
  stock: number;
  /** 서버가 준 상품 사진 주소. 없으면 ProductImage가 번들 사진/벡터로 그린다. */
  imageUrl?: string | null;
}

/** 세로형 상품 카드 — 그리드/가로 스크롤 공용. width 를 주면 그 폭에 맞춘다. */
function ProductCardBase({
  product,
  price,
  width,
  onPress,
  style,
}: {
  product: CardProduct;
  /** 할인 반영된 판매가. */
  price: number;
  width: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const soldOut = product.stock === 0;

  return (
    <Pressable
      onPress={onPress}
      style={[{ width }, style]}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatWon(price)}${soldOut ? ', 품절' : ''}`}
    >
      <View style={{ gap: 8 }}>
        <View>
          <ProductImage
            id={product.id}
            name={product.name}
            zone={product.zone}
            uri={product.imageUrl}
            size={width}
            radius={theme.imageRadius}
            dimmed={soldOut}
          />
          {soldOut ? (
            <View style={[styles.soldOutOverlay, { borderRadius: theme.imageRadius }]}>
              <Text style={{ fontSize: theme.fontBody - 1, color: '#FFFFFF', fontWeight: '800' }}>품절</Text>
            </View>
          ) : null}
          {!soldOut && product.discountPercent ? (
            <View style={styles.cardBadge}>
              <Badge label={`${product.discountPercent}%`} tone="sale" />
            </View>
          ) : null}
        </View>

        <View style={{ gap: 3 }}>
          {product.brand ? (
            <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }} numberOfLines={1}>
              {product.brand}
            </Text>
          ) : null}
          <Text style={{ fontSize: theme.fontBody - 1, color: colors.text, lineHeight: theme.fontBody + 6 }} numberOfLines={2}>
            {product.name}
          </Text>
          <Price
            price={price}
            original={product.unitPrice}
            discountPercent={product.discountPercent}
            size="sm"
          />
        </View>
      </View>
    </Pressable>
  );
}

/** 그리드에 수십 장이 깔리므로 memo 로 불필요한 재렌더를 막는다. */
export const ProductCard = memo(ProductCardBase);

/** 가로형 상품 줄 — 장바구니·주문 상세처럼 좁은 세로 공간에서 쓴다. */
export function ProductRow({
  product,
  price,
  onPress,
  right,
  imageSize = 76,
}: {
  product: CardProduct;
  price: number;
  onPress?: () => void;
  /** 오른쪽에 붙일 수량 스테퍼 등. */
  right?: React.ReactNode;
  imageSize?: number;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const soldOut = product.stock === 0;

  const body = (
    <View style={styles.row}>
      <ProductImage
        id={product.id}
        name={product.name}
        zone={product.zone}
        uri={product.imageUrl}
        size={imageSize}
        radius={theme.imageRadius}
        dimmed={soldOut}
      />
      <View style={{ flex: 1, gap: 3 }}>
        {product.brand ? (
          <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }} numberOfLines={1}>
            {product.brand}
          </Text>
        ) : null}
        <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }} numberOfLines={2}>
          {product.name}
        </Text>
        {soldOut ? <Badge label="품절" tone="soldout" /> : (
          <Price price={price} original={product.unitPrice} discountPercent={product.discountPercent} size="sm" />
        )}
      </View>
      {right}
    </View>
  );

  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${product.name} 상세 보기`}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

// ── 수량 스테퍼 ──────────────────────────────────────────────────────────

export function QuantityStepper({
  quantity,
  onChange,
  disabled = false,
}: {
  quantity: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const btn = theme.minTouch - 12;

  return (
    <View style={[styles.stepper, { borderColor: colors.border, borderRadius: theme.radiusSm }]}>
      <Pressable
        onPress={() => onChange(quantity - 1)}
        disabled={disabled || quantity <= 1}
        style={[styles.stepperButton, { width: btn, height: btn, opacity: quantity <= 1 ? 0.35 : 1 }]}
        accessibilityLabel="수량 1 줄이기"
      >
        <Icon name="minus" size={16} color={colors.text} strokeWidth={2.5} />
      </Pressable>
      <Text
        style={{ minWidth: 28, textAlign: 'center', fontSize: theme.fontBody, color: colors.text, fontWeight: '700' }}
      >
        {quantity}
      </Text>
      <Pressable
        onPress={() => onChange(quantity + 1)}
        disabled={disabled}
        style={[styles.stepperButton, { width: btn, height: btn }]}
        accessibilityLabel="수량 1 늘리기"
      >
        <Icon name="plus" size={16} color={colors.text} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

// ── 빈 상태 ──────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
        <Icon name="box" size={30} color={colors.textMuted} />
      </View>
      <Text style={{ fontSize: theme.fontBody + 1, color: colors.text, fontWeight: '700' }}>{title}</Text>
      {description ? (
        <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
          {description}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

// ── 가로 스크롤 래퍼 ──────────────────────────────────────────────────────

export function HorizontalRail({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing, paddingHorizontal: 20 }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moreButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  chip: { paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderRadius: 999 },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.35)',
  },
  cardBadge: { position: 'absolute', top: 8, left: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  stepperButton: { alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: 56, alignItems: 'center', gap: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
