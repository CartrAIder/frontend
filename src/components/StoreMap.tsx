/**
 * 매장 평면도 — 길 안내(경로 O), 매장 지도(경로 X), 관리자 지도 편집(칸 선택)이 함께 쓴다.
 *
 * SVG로 바닥·외벽·계산대·선반·경로를 그리고, 한글/이모지 라벨은 SVG 위에 RN Text로 겹쳐
 * 올린다(RN SVG의 Text는 폰트·이모지 렌더가 불안정하다).
 * 좌표계는 viewBox 100 × 120(세로형) 고정이며, 아래 상수를 화면들이 공유한다.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline, Rect } from 'react-native-svg';

import { useTheme } from '@/context/ModeContext';
import { SHELF_ROWS, type StoreZone } from '@/lib/mock/storeMap';

// ── 매장 평면도 좌표계 ─────────────────────────────────────────────────
export const VB_W = 100;
export const VB_H = 120;
export const SHELF_W = 22;
export const SHELF_H = 30;
export const COL_X: Record<number, number> = { 0: 11, 1: 39, 2: 67 }; // 선반 좌측 x
export const ROW_Y: Record<number, number> = { 0: 12, 1: 52 }; // 선반 상단 y
export const MAIN_AISLE_Y = 90; // 선반 앞 메인 통로
export const MID_AISLE_Y = 47; // 위/아래 선반 사이 통로
export const ENTRANCE = { x: 50, y: 95 }; // 현위치(입구 앞)

export interface Shelf {
  id: string;
  label: string;
  icon: string;
  color: string;
  row: number;
  col: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
}

/** 구역 목록에서 매대(row 0~1)만 골라 평면도 좌표를 붙인다. */
export function shelvesFromZones(zones: StoreZone[]): Shelf[] {
  return zones
    .filter((z) => z.row < SHELF_ROWS && COL_X[z.col] !== undefined)
    .map((z) => ({
      id: z.id,
      label: z.label,
      icon: z.icon,
      color: z.color,
      row: z.row,
      col: z.col,
      x: COL_X[z.col],
      y: ROW_Y[z.row],
      cx: COL_X[z.col] + SHELF_W / 2,
      cy: ROW_Y[z.row] + SHELF_H / 2,
    }));
}

/** 입구 → 목적지 선반 앞까지 통로만 따라가는 직각(Manhattan) 경로 좌표. */
export function buildRoute(row: number, col: number): number[][] {
  const colCenter = COL_X[col] + SHELF_W / 2;
  const aisleX = col === 2 ? 64 : 36; // 목적 열로 올라갈 세로 통로
  const rowAisleY = row === 0 ? MID_AISLE_Y : MAIN_AISLE_Y; // 목적 행 앞 통로
  const shelfFrontY = ROW_Y[row] + SHELF_H + 3; // 선반 바로 앞
  const raw = [
    [ENTRANCE.x, ENTRANCE.y],
    [ENTRANCE.x, MAIN_AISLE_Y],
    [aisleX, MAIN_AISLE_Y],
    [aisleX, rowAisleY],
    [colCenter, rowAisleY],
    [colCenter, shelfFrontY],
  ];
  return raw.filter((p, i) => i === 0 || p[0] !== raw[i - 1][0] || p[1] !== raw[i - 1][1]);
}

export function estimateDistanceMeters(toRow: number, toCol: number): number {
  // 입구(하단 중앙, row2·col1)에서의 격자 맨해튼 거리 기반 근사.
  return Math.max(4, (Math.abs(2 - toRow) + Math.abs(1 - toCol)) * 4);
}

/** 목적지가 입구 기준 왼쪽/오른쪽/정면 중 어디인지 (음성·문구 안내용). */
export function sideOfShelf(shelf: Shelf | undefined): string {
  if (!shelf) return '';
  return shelf.cx < 48 ? '왼쪽' : shelf.cx > 52 ? '오른쪽' : '정면';
}

function pct(v: number, span: number) {
  return `${(v / span) * 100}%` as const;
}

export interface LegendItem {
  label: string;
  color: string;
  /** 점 대신 선으로 표시(경로 등). */
  line?: boolean;
}

export function StoreMap({
  zones,
  route,
  /** 빨간 핀 + 강조 테두리를 그릴 구역 (길 안내 목적지). */
  destinationZoneId,
  /** 파란 강조 테두리만 그릴 구역 (지도에서 탭해 고른 구역·편집 대상). */
  selectedZoneId,
  onZonePress,
  showCurrentPin = true,
  legend,
}: {
  zones: StoreZone[];
  route?: number[][] | null;
  destinationZoneId?: string | null;
  selectedZoneId?: string | null;
  onZonePress?: (zoneId: string) => void;
  showCurrentPin?: boolean;
  legend?: LegendItem[];
}) {
  const theme = useTheme();
  const { colors } = theme;
  const shelves = shelvesFromZones(zones);
  const destShelf = destinationZoneId ? shelves.find((s) => s.id === destinationZoneId) : undefined;

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.mapBox}>
        <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          {/* 바닥 + 외벽 */}
          <Rect x={3} y={3} width={94} height={114} rx={7} fill={colors.surface} stroke={colors.border} strokeWidth={1.4} />
          {/* 계산대 카운터 */}
          <Rect x={12} y={100} width={76} height={11} rx={2.5} fill={colors.primarySurface} stroke={colors.border} strokeWidth={0.6} />
          {/* 입구 (하단 벽 개구부) */}
          <Rect x={42} y={112} width={16} height={7} fill={colors.background} />

          {/* 선반 매대 */}
          {shelves.map((s) => {
            const isDestination = destShelf?.id === s.id;
            const isSelected = selectedZoneId === s.id;
            const stroke = isDestination ? colors.danger : isSelected ? colors.primary : colors.border;
            return (
              <Rect
                key={s.id}
                x={s.x}
                y={s.y}
                width={SHELF_W}
                height={SHELF_H}
                rx={2.5}
                fill={s.color}
                stroke={stroke}
                strokeWidth={isDestination || isSelected ? 1.8 : 0.5}
              />
            );
          })}

          {/* 경로 */}
          {route && route.length > 1 && (
            <Polyline
              points={route.map((p) => p.join(',')).join(' ')}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2.8}
              strokeDasharray="3,2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 현위치 */}
          {showCurrentPin && (
            <>
              <Circle cx={ENTRANCE.x} cy={ENTRANCE.y} r={5.2} fill={colors.primary} opacity={0.2} />
              <Circle cx={ENTRANCE.x} cy={ENTRANCE.y} r={3} fill={colors.primary} stroke="#FFFFFF" strokeWidth={0.8} />
            </>
          )}

          {/* 목적지 핀 */}
          {destShelf && (
            <>
              <Circle cx={destShelf.cx} cy={destShelf.cy} r={5.5} fill={colors.danger} opacity={0.18} />
              <Circle cx={destShelf.cx} cy={destShelf.cy} r={3.4} fill={colors.danger} stroke="#FFFFFF" strokeWidth={0.8} />
              <Circle cx={destShelf.cx} cy={destShelf.cy} r={1.3} fill="#FFFFFF" />
            </>
          )}
        </Svg>

        {/* 선반 라벨 (SVG 위 RN 오버레이 — 탭 가능하면 Pressable) */}
        {shelves.map((s) => {
          const box = {
            left: pct(s.x, VB_W),
            top: pct(s.y, VB_H),
            width: pct(SHELF_W, VB_W),
            height: pct(SHELF_H, VB_H),
          } as const;
          const content = (
            <>
              <Text style={{ fontSize: theme.fontBody - 1 }}>{s.icon}</Text>
              <Text
                style={{ fontSize: theme.fontBody - 6, color: '#1F2937', fontWeight: '600', textAlign: 'center' }}
                numberOfLines={1}
              >
                {s.label}
              </Text>
            </>
          );
          return onZonePress ? (
            <Pressable
              key={s.id}
              onPress={() => onZonePress(s.id)}
              accessibilityRole="button"
              accessibilityLabel={`${s.label} 구역`}
              style={[styles.shelfLabel, box]}
            >
              {content}
            </Pressable>
          ) : (
            <View key={s.id} pointerEvents="none" style={[styles.shelfLabel, box]}>
              {content}
            </View>
          );
        })}

        <View
          pointerEvents="none"
          style={[styles.counterLabel, { left: pct(12, VB_W), top: pct(100, VB_H), width: pct(76, VB_W), height: pct(11, VB_H) }]}
        >
          <Text style={{ fontSize: theme.fontBody - 5, color: colors.primary, fontWeight: '700' }}>🧾 계산대 · 출구</Text>
        </View>
        <View pointerEvents="none" style={[styles.entranceLabel, { top: pct(113, VB_H) }]}>
          <Text style={{ fontSize: theme.fontBody - 6, color: colors.textMuted, fontWeight: '600' }}>입구</Text>
        </View>
      </View>

      {legend && legend.length > 0 && (
        <View style={styles.legendRow}>
          {legend.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[item.line ? styles.legendLine : styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: { width: '100%', aspectRatio: VB_W / VB_H, position: 'relative' },
  shelfLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: 1 },
  counterLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  entranceLabel: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
});
