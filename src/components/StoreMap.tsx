/**
 * 매장 평면도 — 매장 지도·상품 상세의 위치 안내·관리자 지도 편집이 함께 쓴다.
 *
 * 실제 마트 도면처럼 보이도록 바닥 타일, 두께 있는 외벽, 곤돌라 매대(선반 칸이 보이는),
 * 계산대 레인, 입구 문 스윙까지 그린다. 한글 라벨은 SVG 위에 RN Text로 겹쳐 올린다
 * (RN SVG의 Text는 폰트 렌더가 기기마다 다르다).
 *
 * 좌표계는 viewBox 100 × 120(세로형) 고정이며, 아래 상수를 화면들이 공유한다.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Pattern, Polyline, Rect, Stop } from 'react-native-svg';

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
  /** 빨간 핀 + 강조 테두리를 그릴 구역 (목적지). */
  destinationZoneId,
  /** 파란 강조 테두리만 그릴 구역 (탭해 고른 구역·편집 대상). */
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
      <View style={[styles.mapBox, { borderRadius: theme.radius, backgroundColor: '#FFFFFF' }]}>
        <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Defs>
            {/* 바닥 타일 */}
            <Pattern id="floor" width={8} height={8} patternUnits="userSpaceOnUse">
              <Rect width={8} height={8} fill="#FAFBFC" />
              <Path d="M8 0 L8 8 M0 8 L8 8" stroke="#EDF0F5" strokeWidth={0.5} />
            </Pattern>
            {/* 매대 상판 그라디언트 */}
            <LinearGradient id="shelfTop" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.1} />
            </LinearGradient>
          </Defs>

          {/* 바닥 */}
          <Rect x={4} y={4} width={92} height={112} rx={5} fill="url(#floor)" />

          {/* 외벽 (두께감) */}
          <Rect
            x={4}
            y={4}
            width={92}
            height={112}
            rx={5}
            fill="none"
            stroke="#CBD5E1"
            strokeWidth={2.6}
          />
          <Rect x={4} y={4} width={92} height={112} rx={5} fill="none" stroke="#94A3B8" strokeWidth={0.6} />

          {/* 입구 개구부 — 벽을 끊고 문 스윙을 그린다 */}
          <Rect x={41} y={113} width={18} height={5} fill="#FFFFFF" />
          <Path d="M41 116 A 18 18 0 0 1 59 116" fill="none" stroke="#CBD5E1" strokeWidth={0.7} strokeDasharray="1.6,1.4" />
          <Path d="M50 108 L50 100 M47 103 L50 100 L53 103" stroke={colors.primary} strokeWidth={1.1} fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* 계산대 레인 3개 */}
          <G>
            {[16, 42, 68].map((lx) => (
              <G key={lx}>
                {/* 컨베이어 */}
                <Rect x={lx} y={101} width={16} height={4.5} rx={1.2} fill="#E2E8F0" stroke="#CBD5E1" strokeWidth={0.4} />
                {/* 계산기 */}
                <Rect x={lx + 16.5} y={100} width={4} height={6.5} rx={1} fill={colors.primary} opacity={0.75} />
              </G>
            ))}
          </G>

          {/* 매대(곤돌라) */}
          {shelves.map((s) => {
            const isDestination = destShelf?.id === s.id;
            const isSelected = selectedZoneId === s.id;
            const stroke = isDestination ? colors.danger : isSelected ? colors.primary : '#94A3B8';
            const strokeW = isDestination || isSelected ? 1.8 : 0.7;
            return (
              <G key={s.id}>
                {/* 바닥 그림자 */}
                <Rect x={s.x + 1} y={s.y + 2} width={SHELF_W} height={SHELF_H} rx={2} fill="#0F172A" opacity={0.06} />
                {/* 몸체 */}
                <Rect x={s.x} y={s.y} width={SHELF_W} height={SHELF_H} rx={2} fill={s.color} stroke={stroke} strokeWidth={strokeW} />
                {/* 선반 칸 — 곤돌라처럼 보이게 */}
                <Line x1={s.x + 1.5} y1={s.y + SHELF_H * 0.36} x2={s.x + SHELF_W - 1.5} y2={s.y + SHELF_H * 0.36} stroke="#FFFFFF" strokeWidth={0.9} opacity={0.75} />
                <Line x1={s.x + 1.5} y1={s.y + SHELF_H * 0.62} x2={s.x + SHELF_W - 1.5} y2={s.y + SHELF_H * 0.62} stroke="#FFFFFF" strokeWidth={0.9} opacity={0.75} />
                {/* 상판 광택 */}
                <Rect x={s.x} y={s.y} width={SHELF_W} height={SHELF_H * 0.3} rx={2} fill="url(#shelfTop)" />
              </G>
            );
          })}

          {/* 경로 — 흰 테두리를 깔아 바닥과 분리 */}
          {route && route.length > 1 ? (
            <>
              <Polyline
                points={route.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={4.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Polyline
                points={route.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2.4}
                strokeDasharray="3.4,2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : null}

          {/* 현위치 */}
          {showCurrentPin ? (
            <>
              <Circle cx={ENTRANCE.x} cy={ENTRANCE.y} r={6} fill={colors.primary} opacity={0.14} />
              <Circle cx={ENTRANCE.x} cy={ENTRANCE.y} r={3.2} fill={colors.primary} stroke="#FFFFFF" strokeWidth={1} />
            </>
          ) : null}

          {/* 목적지 핀 */}
          {destShelf ? (
            <>
              <Circle cx={destShelf.cx} cy={destShelf.cy} r={6.5} fill={colors.danger} opacity={0.16} />
              <Path
                d={`M${destShelf.cx} ${destShelf.cy + 4.5} L${destShelf.cx - 3.2} ${destShelf.cy - 1.4} A 3.2 3.2 0 1 1 ${destShelf.cx + 3.2} ${destShelf.cy - 1.4} Z`}
                fill={colors.danger}
                stroke="#FFFFFF"
                strokeWidth={0.7}
              />
              <Circle cx={destShelf.cx} cy={destShelf.cy - 2.2} r={1.15} fill="#FFFFFF" />
            </>
          ) : null}
        </Svg>

        {/* 매대 라벨 (SVG 위 RN 오버레이 — 탭 가능하면 Pressable) */}
        {shelves.map((s) => {
          const box = {
            left: pct(s.x, VB_W),
            top: pct(s.y, VB_H),
            width: pct(SHELF_W, VB_W),
            height: pct(SHELF_H, VB_H),
          } as const;
          const content = (
            <Text
              style={{
                fontSize: theme.fontBody - 5,
                color: '#334155',
                fontWeight: '700',
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              {s.label}
            </Text>
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
          style={[styles.counterLabel, { top: pct(93, VB_H) }]}
        >
          <Text style={{ fontSize: theme.fontBody - 6, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.4 }}>
            계산대
          </Text>
        </View>
        <View pointerEvents="none" style={[styles.entranceLabel, { top: pct(108.5, VB_H) }]}>
          <Text style={{ fontSize: theme.fontBody - 6, color: colors.primary, fontWeight: '800' }}>입구</Text>
        </View>
      </View>

      {legend && legend.length > 0 ? (
        <View style={styles.legendRow}>
          {legend.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[item.line ? styles.legendLine : styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: { width: '100%', aspectRatio: VB_W / VB_H, position: 'relative', overflow: 'hidden' },
  shelfLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  counterLabel: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  entranceLabel: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
});
