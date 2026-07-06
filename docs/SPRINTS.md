# CartrAIder 스프린트 계획

프론트엔드(모바일 앱) 기준 스프린트. 각 스프린트는 **사용자 확인 후** 다음으로 진행한다.
기획: `PROJECT_정리.md` / 규칙: `CLAUDE.md`

> 표기: `[ ]` 미완 · `[~]` 진행 중 · `[x]` 완료

---

## Sprint 0 — 프로젝트 초기 세팅 (기반) ✅ 완료

**목표**: 빈 Expo 앱이 실행되고, 5개 라우트가 껍데기로 연결된 상태.

- [x] Expo(SDK 57) + TypeScript(strict) 프로젝트 생성, Expo Router v3 설정
- [x] 폴더 구조 세팅 (`src/app`, `src/context`, `src/theme`, `src/lib`)
- [x] 의존성 설치: expo-camera, expo-secure-store, react-native-sse
- [x] tsconfig strict, ESLint(eslint-config-expo)/Prettier 설정
- [x] 5개 라우트 스텁 생성 (index / cart / checkout / complete / navigate)
- [x] 검증: tsc 통과 / eslint 통과 / expo-doctor 20/20 / iOS 번들 성공

**완료 기준**: `npx expo start`로 앱이 뜨고 화면 간 이동이 된다.
**결과**: `CartrAIder/frontend` main에 커밋. 실제 구조는 템플릿 관례에 따라 `src/` 하위.

---

## Sprint 1 — 디자인 토큰 & 모드 토글 (접근성 기반) ✅ 완료

**목표**: 일반인/노약자 모드 전환 인프라 완성. 이후 모든 화면이 이 위에 올라간다.

- [x] `theme/tokens.ts` — normal / senior 두 벌 (글자·간격·터치높이·색대비)
- [x] `context/ModeContext.tsx` — `mode: 'normal' | 'senior'`, 기본 normal
- [x] 모드에 따라 토큰을 반환하는 `useTheme()` 훅
- [x] 첫 화면(카트 연결)에 토글 UI 배치
- [x] (선택) secure-store에 모드 저장 → 재실행 시 유지

**완료 기준**: 토글을 켜면 첫 화면 글자/버튼 크기·대비가 senior 값으로 바뀐다.

---

## Sprint 2 — 화면 ① 카트 연결 ✅ 완료

**목표**: QR 스캔으로 카트 세션을 연결한다.

- [x] `AuthContext` + 로그인/JWT 저장(secure-store) 최소 구현 (mock 가능)
- [x] `lib/api.ts` custom fetch wrapper (JWT 자동 첨부)
- [x] expo-camera로 QR 스캔 → 카트 ID 추출
- [x] "직접 코드 입력하기" 대체 입력 경로
- [x] Spring Boot 연동 요청(REST, mock) → 성공 시 장바구니 화면 이동
- [x] 모드별 레이아웃 검증 (normal/senior)

**완료 기준**: QR/코드로 연결하면 장바구니 화면으로 넘어간다.

---

## Sprint 3 — 화면 ② 장바구니 (SSE 실시간) ✅ 완료

**목표**: 담긴 상품·합계가 실시간으로 갱신되고 수량 조절/삭제가 된다.

- [x] `context/CartContext.tsx` (useReducer) — 상품 목록·합계 상태
- [x] `lib/sse.ts` — SSE 연결(EventSource 폴리필), 수신 이벤트로 장바구니 갱신
- [x] 수량 +/- , 상품 삭제 → REST 호출 (mock)
- [x] "방금 추가됨" 실시간 하이라이트, 총 결제 예정 금액 표시
- [x] 결제하기 버튼 → 결제 확인 화면 이동
- [x] 모드별 레이아웃 검증

**완료 기준**: mock SSE 이벤트가 들어오면 목록/합계가 즉시 갱신되고, 수량·삭제가 반영된다.

---

## Sprint 4 — 화면 ③④ 결제 확인 & 완료 ✅ 완료

**목표**: 2탭 결제 동선 완성 + 결제 완료(QR 영수증·음성).

- [x] 결제 확인: 주문 요약, 결제 수단 표시, 최종 금액, 1탭 확인
- [x] 결제 요청(REST, mock) → "결제 성공" 가정 처리
- [x] 결제 완료: 성공 표시, QR 영수증, 세션 종료
- [x] senior 모드일 때 결제 완료 음성 안내(TTS) 제공
- [x] 모드별 레이아웃 검증

**완료 기준**: 결제 확인 1탭 → 완료 화면 1탭 동선이 동작하고, senior에서 음성이 나온다.

---

## Sprint 5 — 화면 ⑤ 매장 길 안내 (부가) ✅ 완료

**목표**: 상품 위치 안내 + 할인 이벤트 노출.

- [x] 상품 검색 입력, 매장 지도(간이) 표시
- [x] 목적지 상품 정보·경로 안내
- [x] senior 모드일 때 음성 길 안내
- [x] 카트 근처 할인 이벤트 알림 표시

**완료 기준**: 상품을 선택하면 위치/경로가 표시된다. (우선순위 낮음)

---

## Sprint 6 — 통합·마감

- [ ] 실제 백엔드 API 명세 반영 (SSE 인증 방식, REST 엔드포인트 확정)
- [ ] 세션 복구/자동 해제, 에러·재연결 처리
- [ ] 접근성 최종 검증 (글자 18pt+, 대비 AA, 터치 56px)
- [ ] 시연 시나리오 점검, 발표자료 대응

---

## 진행 원칙

- 스프린트 0 → 1 → 2 … 순서대로. **1과 2 사이 순서 특히 중요** (토글 인프라가 먼저).
- 백엔드 미확정 부분은 mock으로 진행, `TODO(api)` 주석.
- 각 스프린트 종료 시 사용자 확인 후 다음 진행.
