# CLAUDE.md

이 파일은 이 저장소에서 코드를 다룰 때 Claude Code(및 에이전트)가 따라야 할 지침이다.
프로젝트의 상세 기획은 `PROJECT_정리.md`를 참조한다.

---

## 프로젝트 개요

**CartrAIder — 스마트 AI 카트 고객용 모바일 앱 (프론트엔드)**

카트에 부착된 카메라/스캐너로 AI가 상품을 인식 → 서버가 처리 → 앱에 실시간 반영 →
계산대 없이 앱에서 결제하는 셀프 스캔 쇼핑 솔루션. 우리가 만드는 것은 **고객용 모바일 앱**이다.

- 앱은 **Spring Boot 단일 서버**하고만 통신한다. (FastAPI/Kafka/Redis/라즈베리파이는 내부 파이프라인 → 앱은 몰라도 됨)
- 실제 PG 결제는 범위 밖 → **"결제 성공" 가정** 후 이후 데이터 처리만 구현한다.

---

## 기술 스택

- **React Native + Expo SDK** — 크로스플랫폼 앱 기반
- **Expo Router v3** — 파일 기반 라우팅 (`app/` 폴더)
- **TypeScript** — 전체 타입 적용, strict 모드
- **Context + useReducer** — 전역 상태 관리 (장바구니·인증·모드)
- **Custom fetch wrapper** — JWT 자동 첨부·에러 공통 처리 (~20줄, Axios 안 씀)
- **SSE (Server-Sent Events)** — Spring Boot → 앱 단방향 실시간 수신 (WebSocket 사용 금지)
- **expo-camera** — QR·바코드 스캔
- **expo-secure-store** — JWT 토큰 안전 저장

### 배제 라이브러리 (도입 금지)
- Axios → custom fetch wrapper로 대체
- TanStack Query → 실시간은 SSE, REST는 mutation 5개뿐이라 불필요
- Zustand / Redux → Context + useReducer로 충분
- WebSocket → **SSE로 대체 (절대 사용하지 말 것)**

---

## 통신 규칙

- **앱 → Spring Boot (REST/HTTPS)**: 카트 연동, 수량 변경, 삭제, 결제 등 능동적 액션
- **Spring Boot → 앱 (SSE)**: 담긴 상품·합계 실시간 푸시 (단방향 수신)
- RN에는 기본 `EventSource`가 없으므로 SSE는 `react-native-sse` 폴리필을 사용한다.
- 모든 REST 요청 헤더에는 custom fetch wrapper가 secure-store의 JWT를 자동 첨부한다.

---

## 접근성: 일반인 / 노약자 모드 토글

- 전역 `ModeContext`에 `mode: 'normal' | 'senior'` 상태를 둔다. **기본값은 `normal`(일반인)**.
- 토글은 **첫 화면(카트 연결)에만** 배치한다. 쇼핑 시작 전 한 번 선택.
- 두 모드는 **기능 100% 동일**, 글자 크기·간격·대비·음성 안내만 다르다.
- 화면 컴포넌트는 **한 벌만** 만들고, 스타일 값은 `theme[mode]` 토큰에서 읽는다.
  화면마다 두 벌씩 만들지 말 것.

| 요소 | normal (기본) | senior |
|------|--------------|--------|
| 본문/버튼/금액 | 15 / 18 / 20pt | 18 / 24 / 30pt |
| 터치 영역 높이 | 44px | 56px 이상 |
| 색 대비 | 표준 | 고대비 WCAG AA (4.5:1) |
| 여백·정보밀도 | 조밀 | 넉넉 |
| 음성 안내(결제완료·길안내) | 생략 | 제공 |

---

## 폴더 구조

Expo 템플릿 관례에 따라 소스는 `src/` 하위에 둔다. 경로 별칭 `@/*` → `./src/*`.

```
src/
  app/
    _layout.tsx        # 루트 Stack + ModeProvider/SafeArea/GestureHandler
    index.tsx          # (1) 카트 연결 + 모드 토글 (토글은 여기서만)
    cart.tsx           # (2) 장바구니 (SSE 실시간)
    checkout.tsx       # (3) 결제 확인 (1탭)
    complete.tsx       # (4) 결제 완료 (QR 영수증·음성)
    navigate.tsx       # (5) 매장 길 안내
  context/
    ModeContext.tsx    # mode: 'normal' | 'senior' (기본 normal) — 구현됨
    CartContext.tsx    # 장바구니 상태 (useReducer) — Sprint 3
    AuthContext.tsx    # JWT — Sprint 2
  theme/
    tokens.ts          # normal / senior 두 벌 (글자·간격·대비)
  lib/
    api.ts             # custom fetch wrapper (JWT 자동 첨부)
    sse.ts             # SSE(react-native-sse) 연결
```

> 앱 코드는 `CartrAIder/frontend` 레포에 있다. 이 디렉터리(`창의공학설계`)는 기획/문서 공간이다.

---

## 코딩 규칙

- 언어: 코드 주석·커밋 메시지는 한국어 허용, 식별자는 영어.
- 스타일: 기존 파일의 컨벤션(들여쓰기·네이밍·주석 밀도)을 그대로 따른다.
- 하드코딩된 폰트 크기/색상 금지 → 반드시 `theme[mode]` 토큰 사용.
- API base URL, SSE 엔드포인트 등은 상수/환경변수로 분리한다.
- 백엔드 API 명세 미확정 부분(SSE 인증 방식 등)은 TODO로 표시하고 목(mock)으로 개발.

---

## 개발 진행 방식

- 스프린트 계획은 `docs/SPRINTS.md`에 있다. 스프린트 순서대로 진행한다.
- 각 스프린트/작업은 **사용자 확인 후** 진행한다. 임의로 다음 스프린트로 넘어가지 않는다.
