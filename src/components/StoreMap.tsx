/**
 * 매장 평면도 — 매장 지도·상품 상세의 위치 안내·관리자 지도 편집이 함께 쓴다.
 *
 * 실제 마트 도면처럼 보이도록 바닥 타일, 두께 있는 외벽, 곤돌라 매대(선반 칸이 보이는),
 * 계산대 레인, 카트 보관소, 입구 매트와 문 스윙까지 그린다. 한글 라벨은 SVG 위에 RN
 * Text로 겹쳐 올린다 (RN SVG의 Text는 폰트 렌더가 기기마다 다르다).
 *
 * 움직이는 것들(카트 주행, 현위치 펄스, 목적지 핀 드롭)은 reanimated로 돈다.
 *
 * ⚠️ 애니메이션은 **SVG 밖의 RN View에 transform·opacity로만** 건다. SVG prop은 건드리지 않는다.
 *  - New Architecture(Fabric)에서 SVG prop(`cx`·`r`·`strokeDashoffset`·`transform` 등)을
 *    `useAnimatedProps`로 바꾸면 매 프레임 Shadow Tree 커밋이 일어나고, react-native-svg는
 *    그때마다 캔버스 전체(바닥 패턴·그라디언트·매대 수십 개)를 다시 그린다. 숫자 prop이라도 마찬가지라,
 *    예전에 `transform` 문자열 → `cx`·`cy`로 바꾼 뒤에도 상품 상세·지도가 계속 버벅였다.
 *  - View의 transform·opacity는 reanimated의 동기 UI prop 경로(package.json의
 *    `*_SYNCHRONOUSLY_UPDATE_UI_PROPS`)로 커밋 없이 네이티브 뷰에 바로 반영된다. SVG는 한 번 그린 뒤
 *    다시 그려지지 않는다.
 *  그래서 평면도·경로는 정적 SVG로 그리고, 움직이는 것은 그 위에 겹친 View 오버레이로 둔다.
 *  viewBox 좌표 → 픽셀 변환에 필요한 지도 폭은 onLayout으로 한 번 잰다.
 *
 * 화면이 포커스를 잃으면(다른 화면을 push) 반복 애니메이션을 전부 멈춘다 — expo-router는 뒤
 * 화면을 살려두기 때문에, 안 그러면 안 보이는 지도가 계속 프레임을 먹는다.
 *
 * 좌표계는 viewBox 100 × 120(세로형) 고정이며, 아래 상수를 화면들이 공유한다.
 */
import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { useTheme } from '@/context/ModeContext';
import { SHELF_ROWS, zoneIconName, type StoreZone } from '@/lib/mock/storeMap';

import { Icon } from './Icon';

/** 경로가 없을 때 쓰는 고정 빈 배열 — 렌더마다 새 `[]`를 만들면 애니메이션 워크릿이 매번 다시 엮인다. */
const NO_POINTS: number[] = [];

// 오버레이 크기(viewBox 단위) — 예전 SVG 원 반지름과 같다.
const CART_R = 3.6;
const CART_INNER_R = 2.6;
const CART_DOT_R = 0.9;
const PULSE_MIN_R = 3.2;
/** 펄스 최대 반경 — 7로 묶어 아래 계산대(y=101)와 겹치지 않게 한다. */
const PULSE_MAX_R = 7;
/** 핀이 떨어지기 시작하는 높이. */
const PIN_DROP = 14;

// ── 매장 평면도 좌표계 ─────────────────────────────────────────────────
export const VB_W = 100;
export const VB_H = 120;
export const SHELF_W = 22;
export const SHELF_H = 30;
export const COL_X: Record<number, number> = { 0: 11, 1: 39, 2: 67 }; // 선반 좌측 x
export const ROW_Y: Record<number, number> = { 0: 12, 1: 52 }; // 선반 상단 y
export const MAIN_AISLE_Y = 90; // 선반 앞 메인 통로
export const MID_AISLE_Y = 47; // 위/아래 선반 사이 통로
export const ENTRANCE = { x: 50, y: 93 }; // 현위치(입구 앞) — 펄스 링이 계산대에 닿지 않는 높이

/**
 * 경로 위 한 점의 좌표 — `axis` 0이면 x, 1이면 y.
 *
 * 모듈 스코프 worklet이라 화면 클로저를 안 물고 UI 스레드에서 그대로 돈다.
 * x·y를 따로 구하는 건 한 번에 `{x, y}`를 돌려주면 프레임마다 객체가 할당되기 때문이다.
 */
function pointOnRoute(
  flat: number[],
  lengths: number[],
  total: number,
  progress: number,
  axis: 0 | 1,
): number {
  'worklet';
  const fallback = axis === 0 ? ENTRANCE.x : ENTRANCE.y;
  if (lengths.length === 0) return fallback;
  let remain = progress * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (remain <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] === 0 ? 0 : Math.min(1, remain / lengths[i]);
      const a = flat[i * 2 + axis];
      const b = flat[(i + 1) * 2 + axis];
      return a + (b - a) * t;
    }
    remain -= lengths[i];
  }
  return fallback;
}

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

/** 경로를 SVG path 문자열과 누적 길이로 바꾼다(그리기·주행 애니메이션 공용). */
function measureRoute(route: number[][] | null | undefined) {
  if (!route || route.length < 2) return null;
  const flat: number[] = [];
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < route.length; i += 1) {
    flat.push(route[i][0], route[i][1]);
    if (i > 0) {
      const dx = route[i][0] - route[i - 1][0];
      const dy = route[i][1] - route[i - 1][1];
      const len = Math.hypot(dx, dy);
      lengths.push(len);
      total += len;
    }
  }
  const d = route.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ');
  return { d, flat, lengths, total };
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
  /** 구역별 장바구니 담긴 개수 — 지도 위에 배지로 띄운다. */
  zoneCounts,
}: {
  zones: StoreZone[];
  route?: number[][] | null;
  destinationZoneId?: string | null;
  selectedZoneId?: string | null;
  onZonePress?: (zoneId: string) => void;
  showCurrentPin?: boolean;
  legend?: LegendItem[];
  zoneCounts?: Record<string, number>;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const shelves = useMemo(() => shelvesFromZones(zones), [zones]);
  const destShelf = destinationZoneId ? shelves.find((s) => s.id === destinationZoneId) : undefined;
  const measured = useMemo(() => measureRoute(route), [route]);
  /** 목적지·선택이 있으면 나머지 매대를 살짝 죽여 대비를 준다. */
  const hasFocus = Boolean(destShelf || selectedZoneId);
  /** 화면이 뒤로 밀리면(다른 화면 push) 반복 애니메이션을 멈춘다. */
  const isFocused = useIsFocused();

  /** viewBox 1단위가 몇 px인지 — 지도 폭을 재기 전(0)에는 오버레이를 그리지 않는다. */
  const [mapWidth, setMapWidth] = useState(0);
  const unit = mapWidth / VB_W;
  const onMapLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    // 소수점 떨림으로 인한 재렌더를 막는다.
    if (Math.abs(w - mapWidth) > 0.5) setMapWidth(w);
  };

  // ── 카트 주행 ────────────────────────────────────────────────────
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!measured || !isFocused) return;
    progress.value = 0;
    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 2200,
          easing: Easing.inOut(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
        // 끝에서 잠깐 머물렀다가 다시 입구에서 출발한다.
        withDelay(900, withTiming(1, { duration: 0 })),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [measured, isFocused, progress]);

  const total = measured?.total ?? 0;
  const flat = measured?.flat ?? NO_POINTS;
  const lengths = measured?.lengths ?? NO_POINTS;
  // 진행률(0~1) → 경로 위 좌표 → 픽셀 translate. 오버레이는 (0,0)에 놓고 transform으로만 옮긴다.
  const cartStyle = useAnimatedStyle(() => {
    const x = pointOnRoute(flat, lengths, total, progress.value, 0);
    const y = pointOnRoute(flat, lengths, total, progress.value, 1);
    return {
      transform: [{ translateX: (x - CART_R) * unit }, { translateY: (y - CART_R) * unit }],
    };
  });

  // ── 현위치 펄스 ────────────────────────────────────────────────
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!showCurrentPin || !isFocused) return;
    // 포커스를 잃을 때 cancelAnimation이 중간값을 남기므로, 돌아오면 처음부터 다시 퍼지게 한다.
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 1800,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [showCurrentPin, isFocused, pulse]);

  // 최대 크기의 원을 scale로 줄였다 키운다(반지름 3.2 → 7).
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.28 * (1 - pulse.value),
    transform: [{ scale: (PULSE_MIN_R + pulse.value * (PULSE_MAX_R - PULSE_MIN_R)) / PULSE_MAX_R }],
  }));

  // ── 목적지 핀 드롭 ─────────────────────────────────────────────
  const pinDrop = useSharedValue(0);
  useEffect(() => {
    if (!destShelf) return;
    pinDrop.value = 0;
    pinDrop.value = withDelay(
      120,
      withSpring(1, { damping: 9, stiffness: 140, reduceMotion: ReduceMotion.System }),
    );
  }, [destShelf?.id, pinDrop]); // eslint-disable-line react-hooks/exhaustive-deps

  const pinStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pinDrop.value * 2),
    transform: [{ translateY: (1 - pinDrop.value) * -PIN_DROP * unit }],
  }));

  return (
    <View style={{ gap: 10 }}>
      <View
        style={[styles.mapBox, { borderRadius: theme.radius, backgroundColor: '#FFFFFF' }]}
        onLayout={onMapLayout}
      >
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
            {/* 천장 조명 — 매장 안쪽이 밝아 보이게 */}
            <RadialGradient id="ceiling" cx="50%" cy="34%" r="62%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
              <Stop offset="1" stopColor="#E8EDF5" stopOpacity={0.25} />
            </RadialGradient>
          </Defs>

          {/* 바닥 */}
          <Rect x={4} y={4} width={92} height={112} rx={5} fill="url(#floor)" />
          <Rect x={4} y={4} width={92} height={112} rx={5} fill="url(#ceiling)" />

          {/* 통로 가이드 — 실제 마트 바닥의 동선 라인 */}
          <G opacity={0.5}>
            <Line
              x1={8}
              y1={MID_AISLE_Y}
              x2={92}
              y2={MID_AISLE_Y}
              stroke="#DCE3EC"
              strokeWidth={0.6}
              strokeDasharray="2,2.4"
            />
            <Line
              x1={8}
              y1={MAIN_AISLE_Y}
              x2={92}
              y2={MAIN_AISLE_Y}
              stroke="#DCE3EC"
              strokeWidth={0.6}
              strokeDasharray="2,2.4"
            />
            <Line
              x1={36}
              y1={10}
              x2={36}
              y2={MAIN_AISLE_Y}
              stroke="#DCE3EC"
              strokeWidth={0.6}
              strokeDasharray="2,2.4"
            />
            <Line
              x1={64}
              y1={10}
              x2={64}
              y2={MAIN_AISLE_Y}
              stroke="#DCE3EC"
              strokeWidth={0.6}
              strokeDasharray="2,2.4"
            />
          </G>

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
          <Rect
            x={4}
            y={4}
            width={92}
            height={112}
            rx={5}
            fill="none"
            stroke="#94A3B8"
            strokeWidth={0.6}
          />

          {/* 입구 — 벽을 끊고 매트 + 문 스윙 */}
          <Rect x={41} y={113} width={18} height={5} fill="#FFFFFF" />
          <Rect
            x={40}
            y={108.5}
            width={20}
            height={4.5}
            rx={1}
            fill={colors.primary}
            opacity={0.1}
          />
          <Path
            d="M41 116 A 18 18 0 0 1 59 116"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth={0.7}
            strokeDasharray="1.6,1.4"
          />
          <Path
            d="M50 108 L50 100 M47 103 L50 100 L53 103"
            stroke={colors.primary}
            strokeWidth={1.1}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 카트 보관소 — 입구 옆 디테일 */}
          <G opacity={0.55}>
            {[0, 1, 2].map((i) => (
              <Rect
                key={i}
                x={8 + i * 2.2}
                y={104}
                width={6}
                height={7}
                rx={1}
                fill="none"
                stroke="#B6C2D1"
                strokeWidth={0.6}
              />
            ))}
          </G>

          {/* 계산대 레인 3개 */}
          <G>
            {[16, 42, 68].map((lx) => (
              <G key={lx}>
                {/* 컨베이어 */}
                <Rect
                  x={lx}
                  y={101}
                  width={16}
                  height={4.5}
                  rx={1.2}
                  fill="#E2E8F0"
                  stroke="#CBD5E1"
                  strokeWidth={0.4}
                />
                <Line
                  x1={lx + 4}
                  y1={101}
                  x2={lx + 4}
                  y2={105.5}
                  stroke="#CBD5E1"
                  strokeWidth={0.35}
                />
                <Line
                  x1={lx + 8}
                  y1={101}
                  x2={lx + 8}
                  y2={105.5}
                  stroke="#CBD5E1"
                  strokeWidth={0.35}
                />
                <Line
                  x1={lx + 12}
                  y1={101}
                  x2={lx + 12}
                  y2={105.5}
                  stroke="#CBD5E1"
                  strokeWidth={0.35}
                />
                {/* 계산기 */}
                <Rect
                  x={lx + 16.5}
                  y={100}
                  width={4}
                  height={6.5}
                  rx={1}
                  fill={colors.primary}
                  opacity={0.75}
                />
              </G>
            ))}
          </G>

          {/* 매대(곤돌라) */}
          {shelves.map((s) => {
            const isDestination = destShelf?.id === s.id;
            const isSelected = selectedZoneId === s.id;
            const isFocused = isDestination || isSelected;
            const stroke = isDestination ? colors.danger : isSelected ? colors.primary : '#94A3B8';
            const strokeW = isFocused ? 1.8 : 0.7;
            return (
              <G key={s.id} opacity={hasFocus && !isFocused ? 0.45 : 1}>
                {/* 바닥 그림자 */}
                <Rect
                  x={s.x + 1}
                  y={s.y + 2}
                  width={SHELF_W}
                  height={SHELF_H}
                  rx={2}
                  fill="#0F172A"
                  opacity={0.06}
                />
                {/* 포커스 글로우 */}
                {isFocused ? (
                  <Rect
                    x={s.x - 2}
                    y={s.y - 2}
                    width={SHELF_W + 4}
                    height={SHELF_H + 4}
                    rx={4}
                    fill={stroke}
                    opacity={0.12}
                  />
                ) : null}
                {/* 몸체 */}
                <Rect
                  x={s.x}
                  y={s.y}
                  width={SHELF_W}
                  height={SHELF_H}
                  rx={2}
                  fill={s.color}
                  stroke={stroke}
                  strokeWidth={strokeW}
                />
                {/* 선반 칸 — 곤돌라처럼 보이게 */}
                <Line
                  x1={s.x + 1.5}
                  y1={s.y + SHELF_H * 0.36}
                  x2={s.x + SHELF_W - 1.5}
                  y2={s.y + SHELF_H * 0.36}
                  stroke="#FFFFFF"
                  strokeWidth={0.9}
                  opacity={0.75}
                />
                <Line
                  x1={s.x + 1.5}
                  y1={s.y + SHELF_H * 0.62}
                  x2={s.x + SHELF_W - 1.5}
                  y2={s.y + SHELF_H * 0.62}
                  stroke="#FFFFFF"
                  strokeWidth={0.9}
                  opacity={0.75}
                />
                {/* 진열 상품 느낌의 칸 나눔 */}
                <G opacity={0.35}>
                  {[0.28, 0.5, 0.72].map((f) => (
                    <Line
                      key={f}
                      x1={s.x + SHELF_W * f}
                      y1={s.y + 1.5}
                      x2={s.x + SHELF_W * f}
                      y2={s.y + SHELF_H - 1.5}
                      stroke="#FFFFFF"
                      strokeWidth={0.5}
                    />
                  ))}
                </G>
                {/* 상판 광택 */}
                <Rect
                  x={s.x}
                  y={s.y}
                  width={SHELF_W}
                  height={SHELF_H * 0.3}
                  rx={2}
                  fill="url(#shelfTop)"
                />
              </G>
            );
          })}

          {/* 경로 — 흰 테두리 위에 파란 선. 정적으로 그리고, 움직임은 위를 달리는 카트가 맡는다. */}
          {measured ? (
            <>
              <Path
                d={measured.d}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={3.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.95}
              />
              <Path
                d={measured.d}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : null}

          {/* 현위치 점 — 퍼지는 펄스 링은 아래 View 오버레이가 그린다 */}
          {showCurrentPin ? (
            <>
              <Circle cx={ENTRANCE.x} cy={ENTRANCE.y} r={6} fill={colors.primary} opacity={0.14} />
              <Circle
                cx={ENTRANCE.x}
                cy={ENTRANCE.y}
                r={3.2}
                fill={colors.primary}
                stroke="#FFFFFF"
                strokeWidth={1}
              />
            </>
          ) : null}

          {/* 장바구니 담긴 개수 배지 */}
          {zoneCounts
            ? shelves
                .filter((s) => (zoneCounts[s.id] ?? 0) > 0)
                .map((s) => (
                  <G key={`count-${s.id}`}>
                    <Circle
                      cx={s.x + SHELF_W - 3}
                      cy={s.y + 3}
                      r={4.6}
                      fill={colors.success}
                      stroke="#FFFFFF"
                      strokeWidth={1}
                    />
                  </G>
                ))
            : null}
        </Svg>

        {/* ── 움직이는 오버레이 — SVG를 다시 그리지 않도록 View transform·opacity로만 움직인다 ── */}
        {mapWidth > 0 ? (
          <>
            {showCurrentPin ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.dot,
                  {
                    left: (ENTRANCE.x - PULSE_MAX_R) * unit,
                    top: (ENTRANCE.y - PULSE_MAX_R) * unit,
                    width: PULSE_MAX_R * 2 * unit,
                    height: PULSE_MAX_R * 2 * unit,
                    borderRadius: PULSE_MAX_R * unit,
                    backgroundColor: colors.primary,
                  },
                  pulseStyle,
                ]}
              />
            ) : null}

            {/* 목적지 핀 — 위에서 떨어져 꽂힌다. 지도와 같은 viewBox의 투명 SVG를 통째로 옮긴다. */}
            {destShelf ? (
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, pinStyle]}>
                <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${VB_W} ${VB_H}`}>
                  {/* 매대 한가운데에 꽂으면 구역 이름을 가린다 → 상단 모서리에 세운다. */}
                  <Path
                    d={`M${destShelf.cx} ${destShelf.y + 3.4} L${destShelf.cx - 3.2} ${destShelf.y - 2.5} A 3.2 3.2 0 1 1 ${destShelf.cx + 3.2} ${destShelf.y - 2.5} Z`}
                    fill={colors.danger}
                    stroke="#FFFFFF"
                    strokeWidth={0.8}
                  />
                  <Circle cx={destShelf.cx} cy={destShelf.y - 3.2} r={1.15} fill="#FFFFFF" />
                </Svg>
              </Animated.View>
            ) : null}

            {/* 경로를 따라 달리는 카트 */}
            {measured ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.dot,
                  styles.cart,
                  {
                    width: CART_R * 2 * unit,
                    height: CART_R * 2 * unit,
                    borderRadius: CART_R * unit,
                  },
                  cartStyle,
                ]}
              >
                <View
                  style={[
                    styles.cart,
                    {
                      width: CART_INNER_R * 2 * unit,
                      height: CART_INNER_R * 2 * unit,
                      borderRadius: CART_INNER_R * unit,
                      backgroundColor: colors.primary,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: CART_DOT_R * 2 * unit,
                      height: CART_DOT_R * 2 * unit,
                      borderRadius: CART_DOT_R * unit,
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </View>
              </Animated.View>
            ) : null}
          </>
        ) : null}

        {/* 매대 라벨 (SVG 위 RN 오버레이 — 탭 가능하면 Pressable) */}
        {shelves.map((s) => {
          const box = {
            left: pct(s.x, VB_W),
            top: pct(s.y, VB_H),
            width: pct(SHELF_W, VB_W),
            height: pct(SHELF_H, VB_H),
          } as const;
          const isFocused = destShelf?.id === s.id || selectedZoneId === s.id;
          // 선반 칸 줄무늬 위에 글자가 바로 놓이면 읽기 어렵다 → 반투명 판을 깔고 그 위에 얹는다.
          const content = (
            <View style={styles.labelPlate}>
              <Icon
                name={zoneIconName(s.id)}
                size={theme.fontBody + 3}
                color={isFocused ? colors.text : '#64748B'}
                strokeWidth={1.8}
              />
              <Text
                style={{
                  marginTop: 3,
                  fontSize: theme.fontBody - 5,
                  color: '#334155',
                  fontWeight: '700',
                  textAlign: 'center',
                }}
                numberOfLines={2}
              >
                {s.label}
              </Text>
            </View>
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

        {/* 담긴 개수 숫자 — SVG 배지 위에 얹는다(폰트 렌더 일관성) */}
        {zoneCounts
          ? shelves
              .filter((s) => (zoneCounts[s.id] ?? 0) > 0)
              .map((s) => (
                <View
                  key={`badge-${s.id}`}
                  pointerEvents="none"
                  style={[
                    styles.countBadge,
                    { left: pct(s.x + SHELF_W - 7.6, VB_W), top: pct(s.y - 1.6, VB_H) },
                  ]}
                >
                  <Text
                    style={{ fontSize: theme.fontBody - 7, color: '#FFFFFF', fontWeight: '800' }}
                  >
                    {zoneCounts[s.id]}
                  </Text>
                </View>
              ))
          : null}

        {/* 가운데는 현위치 펄스 자리라 계산대 라벨은 왼쪽으로 뺀다. */}
        <View pointerEvents="none" style={[styles.counterLabel, { top: pct(96, VB_H) }]}>
          <Text
            style={{
              fontSize: theme.fontBody - 6,
              color: colors.textMuted,
              fontWeight: '700',
              letterSpacing: 0.4,
            }}
          >
            계산대
          </Text>
        </View>
        <View pointerEvents="none" style={[styles.entranceLabel, { top: pct(108.5, VB_H) }]}>
          <Text style={{ fontSize: theme.fontBody - 6, color: colors.primary, fontWeight: '800' }}>
            입구
          </Text>
        </View>
      </View>

      {legend && legend.length > 0 ? (
        <View style={styles.legendRow}>
          {legend.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View
                style={[
                  item.line ? styles.legendLine : styles.legendDot,
                  { backgroundColor: item.color },
                ]}
              />
              <Text style={{ fontSize: theme.fontBody - 4, color: colors.textMuted }}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: { width: '100%', aspectRatio: VB_W / VB_H, position: 'relative', overflow: 'hidden' },
  shelfLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  labelPlate: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  countBadge: {
    position: 'absolute',
    width: '9%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { position: 'absolute', left: 0, top: 0 },
  cart: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  counterLabel: { position: 'absolute', left: '7%', alignItems: 'flex-start' },
  entranceLabel: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
});
