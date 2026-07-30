import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { StoreMap } from '@/components/StoreMap';
import { TextField } from '@/components/TextField';
import { useCatalog } from '@/context/CatalogContext';
import { useTheme } from '@/context/ModeContext';
import { SHELF_ROWS, GRID_COLS, ZONE_COLOR_PALETTE } from '@/lib/mock/storeMap';

/** 관리자 지도 편집 — 구역을 골라 이름·아이콘·색상을 바꾸고, 매대 칸으로 옮긴다. */
const ZONE_ICON_CHOICES = ['🥬', '🥛', '🥤', '🥫', '🧊', '🍞', '🍫', '🧻', '🧴', '🐟', '🥩', '📦'];

export default function AdminMapScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const { zones, shelfZones, findZone, productsInZone, updateZone, moveZone } = useCatalog();

  const [selectedId, setSelectedId] = useState<string>(shelfZones[0]?.id ?? '');
  const selected = findZone(selectedId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: theme.spacing }} keyboardShouldPersistTaps="handled">
        {/* 지도 미리보기 — 구역을 탭해서 편집 대상 선택 */}
        <Card style={{ gap: 10 }}>
          <Text style={{ fontSize: theme.fontBody - 2, color: colors.textMuted }}>
            편집할 구역을 지도에서 탭하세요. 변경 즉시 고객 화면에 반영됩니다.
          </Text>
          <StoreMap zones={zones} selectedZoneId={selectedId} onZonePress={setSelectedId} showCurrentPin={false} />
        </Card>

        {selected && (
          <>
            {/* 배치 — 매대 칸 선택 */}
            <Card style={{ gap: 10 }}>
              <View style={styles.sectionHead}>
                <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }}>
                  {selected.icon} {selected.label} 위치
                </Text>
                <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>
                  칸을 누르면 그 자리로 옮기고, 이미 다른 구역이 있으면 서로 자리를 바꿉니다.
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                {Array.from({ length: SHELF_ROWS }, (_, row) => (
                  <View key={row} style={styles.slotRow}>
                    {Array.from({ length: GRID_COLS }, (_, col) => {
                      const occupant = shelfZones.find((z) => z.row === row && z.col === col);
                      const isHere = selected.row === row && selected.col === col;
                      return (
                        <Pressable
                          key={col}
                          onPress={() => moveZone(selected.id, row, col)}
                          style={[
                            styles.slot,
                            {
                              backgroundColor: occupant ? occupant.color : colors.surface,
                              borderColor: isHere ? colors.primary : colors.border,
                              borderWidth: isHere ? 2.5 : 1,
                              borderRadius: theme.radiusSm,
                              minHeight: theme.minTouch + 14,
                            },
                          ]}
                        >
                          <Text style={{ fontSize: 20 }}>{occupant?.icon ?? '＋'}</Text>
                          <Text
                            style={{ fontSize: theme.fontBody - 5, color: '#1F2937', fontWeight: '700' }}
                            numberOfLines={1}
                          >
                            {occupant?.label ?? '빈 칸'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </Card>

            {/* 이름 · 아이콘 · 색상 */}
            <Card style={{ gap: theme.spacing }}>
              <TextField
                label="구역 이름"
                value={selected.label}
                onChangeText={(text) => updateZone(selected.id, { label: text })}
                placeholder="예) 유제품"
              />

              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }}>구역 아이콘</Text>
                <View style={styles.chipWrap}>
                  {ZONE_ICON_CHOICES.map((choice) => {
                    const active = selected.icon === choice;
                    return (
                      <Pressable
                        key={choice}
                        onPress={() => updateZone(selected.id, { icon: choice })}
                        style={[
                          styles.iconCell,
                          {
                            backgroundColor: active ? colors.primarySurface : colors.surface,
                            borderColor: active ? colors.primary : 'transparent',
                            borderRadius: theme.radiusSm,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 22 }}>{choice}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '600' }}>구역 색상</Text>
                <View style={styles.chipWrap}>
                  {ZONE_COLOR_PALETTE.map((color) => {
                    const active = selected.color === color;
                    return (
                      <Pressable
                        key={color}
                        onPress={() => updateZone(selected.id, { color })}
                        accessibilityLabel={`색상 ${color}`}
                        style={[
                          styles.colorCell,
                          {
                            backgroundColor: color,
                            borderColor: active ? colors.primary : colors.border,
                            borderWidth: active ? 3 : 1,
                            borderRadius: theme.radiusSm,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            </Card>

            {/* 이 구역의 상품 */}
            <Card style={{ gap: 8 }}>
              <Text style={{ fontSize: theme.fontBody, color: colors.text, fontWeight: '800' }}>
                이 구역의 상품 {productsInZone(selected.id).length}개
              </Text>
              {productsInZone(selected.id).length === 0 ? (
                <Text style={{ fontSize: theme.fontBody - 3, color: colors.textMuted }}>
                  아직 등록된 상품이 없어요. 상품 관리에서 이 구역으로 지정해주세요.
                </Text>
              ) : (
                <View style={styles.chipWrap}>
                  {productsInZone(selected.id).map((p) => (
                    <View
                      key={p.id}
                      style={[styles.productChip, { backgroundColor: colors.surface, borderRadius: 999 }]}
                    >
                      <Text style={{ fontSize: theme.fontBody - 3, color: colors.text }}>
                        {p.icon} {p.name}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHead: { gap: 3 },
  slotRow: { flexDirection: 'row', gap: 8 },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  colorCell: { width: 46, height: 34 },
  productChip: { paddingHorizontal: 10, paddingVertical: 6 },
});
