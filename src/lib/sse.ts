/**
 * SSE(Server-Sent Events) 연결 — Spring Boot → 앱 단방향 실시간 수신.
 * 장바구니 변경(담기/합계)을 실시간으로 받아 화면에 반영한다. WebSocket은 사용하지 않는다.
 *
 * RN에는 기본 EventSource가 없으므로 react-native-sse 폴리필을 사용한다.
 *
 * TODO(sprint3): react-native-sse로 연결 수립, 이벤트 파싱 → CartContext 갱신, 재연결 처리.
 */

export const SSE_ENDPOINT = '/api/carts/stream';
