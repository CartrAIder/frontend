# CartrAIder · Frontend

스마트 AI 카트 **고객용 모바일 앱**. 고객이 QR로 카트를 연동하고, 카트가 인식한 상품을
실시간으로 확인·수정한 뒤 계산대 없이 앱에서 결제한다.

> 앱은 **Spring Boot 단일 서버**하고만 통신한다. FastAPI/Kafka/Redis/라즈베리파이는
> 내부 파이프라인이며 앱은 인식하지 않는다.

## 기술 스택

| 기술 | 역할 |
|------|------|
| React Native + Expo SDK | 크로스플랫폼 앱 기반 |
| Expo Router v3 | 파일 기반 라우팅 (`app/`) |
| TypeScript | 전체 타입 적용 (strict) |
| Context + useReducer | 전역 상태 (장바구니·인증·모드) |
| Custom fetch wrapper | JWT 자동 첨부·에러 공통 처리 (Axios 미사용) |
| SSE (Server-Sent Events) | Spring Boot → 앱 단방향 실시간 수신 (**WebSocket 미사용**) |
| expo-camera | QR·바코드 스캔 |
| expo-secure-store | JWT 토큰 저장 |

**배제 라이브러리**: Axios / TanStack Query / Zustand / Redux / WebSocket

## 화면 구성

| # | 화면 | 기능 | 통신 |
|---|------|------|------|
| 1 | 카트 연결 | QR 스캔 → 카트 세션 연결 + 모드 토글 | REST |
| 2 | 장바구니 | 상품/합계 실시간 갱신, 수량 ±·삭제 | SSE + REST |
| 3 | 결제 확인 | 주문 요약, 1탭 확인 | REST |
| 4 | 결제 완료 | QR 영수증, 음성 안내, 세션 종료 | — |
| 5 | 매장 길 안내 | 상품 위치·할인 이벤트 | REST |

## 접근성: 일반인 / 노약자 모드

- 전역 `ModeContext`의 `mode: 'normal' | 'senior'`, **기본값 `normal`**.
- 토글은 **첫 화면(카트 연결)에만**. 두 모드는 기능 동일, 글자·간격·대비·음성만 다름.
- 화면은 한 벌만 만들고 스타일은 `theme[mode]` 토큰에서 읽는다.

| 요소 | normal | senior |
|------|--------|--------|
| 본문/버튼/금액 | 15 / 18 / 20pt | 18 / 24 / 30pt |
| 터치 높이 | 44px | 56px+ |
| 색 대비 | 표준 | WCAG AA (4.5:1) |
| 음성 안내 | 생략 | 제공 |

## 폴더 구조

```
app/        # 라우트 5개 (index, cart, checkout, complete, navigate)
context/    # ModeContext, CartContext, AuthContext
theme/      # tokens.ts (normal / senior 두 벌)
lib/        # api.ts (fetch wrapper), sse.ts (EventSource)
```

## 시작하기

```bash
npm install
npx expo start
```

> RN에는 기본 `EventSource`가 없으므로 SSE는 `react-native-sse` 폴리필을 사용한다.

## 개발 진행

스프린트 단위로 진행한다. 계획은 조직 문서 / `docs/SPRINTS.md` 참조.
코드 컨벤션·이슈/PR 템플릿은 [`CartrAIder/.github`](https://github.com/CartrAIder/.github) 참조.

## 팀

팀 카트라이더 · 프론트엔드 파트 — 최수환, 김도영
