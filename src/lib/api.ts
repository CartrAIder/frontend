/**
 * Custom fetch wrapper — 모든 REST 요청에 JWT를 자동 첨부하고 에러를 공통 처리한다.
 * Axios는 사용하지 않는다.
 *
 * TODO(sprint2): secure-store에서 JWT를 읽어 Authorization 헤더 첨부, 에러 규격화 구현.
 */

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // TODO(sprint2): JWT 첨부 · 공통 에러 처리
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }
  return (await res.json()) as T;
}
