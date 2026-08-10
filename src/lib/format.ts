/** 표시용 포맷 헬퍼 — 화면 여러 곳이 같은 규칙으로 값을 보여주기 위한 모음. */

/**
 * 서버 LocalDateTime 문자열(예: "2026-08-10T14:30:02")을 "8월 10일 14:30"으로.
 * 백엔드가 타임존 없는 LocalDateTime을 주므로 Date로 파싱하지 않고 문자열 그대로 읽는다
 * (new Date()로 파싱하면 기기 타임존만큼 시각이 밀린다).
 */
export function formatDateTime(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, , month, day, hour, minute] = m;
  return `${Number(month)}월 ${Number(day)}일 ${hour}:${minute}`;
}

/** 위와 같지만 연도까지 — 상세 화면처럼 정확한 시점이 필요한 곳에서 쓴다. */
export function formatDateTimeFull(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, year, month, day, hour, minute] = m;
  return `${year}년 ${Number(month)}월 ${Number(day)}일 ${hour}:${minute}`;
}

/** 금액을 "₩12,900"으로. */
export function formatWon(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}
