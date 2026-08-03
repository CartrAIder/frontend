<div align="center">

<img src="assets/logo/lockup-color.svg" alt="CartrAIder" width="360" />

### 🛒 고객용 모바일 앱

카트에 부착된 카메라/스캐너로 AI가 상품을 인식 → 서버가 처리 → 앱에 실시간 반영 →
**계산대 없이 앱에서 결제**하는 셀프 스캔 쇼핑 솔루션의 고객용 앱입니다.

![React Native](https://img.shields.io/badge/React_Native-Expo_SDK_54-000?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Expo Router](https://img.shields.io/badge/Expo_Router-v3-000)
![Realtime](https://img.shields.io/badge/Realtime-SSE-2563EB)

</div>

> 앱은 **Spring Boot 단일 서버([quickPass](https://github.com/CartrAIder/quickPass))** 하고만 통신합니다.
> FastAPI/Kafka/Redis/라즈베리파이는 내부 파이프라인이며 앱은 인식하지 않습니다.

---

## ✨ 주요 기능

- **회원 인증** — 이메일 인증 회원가입, 모바일 로그인(토큰 body 발급·secure-store 보관), 액세스 토큰 만료 시 refresh 자동 재발급, refresh까지 만료되면 자동 로그아웃 → 로그인 이동
- **실시간 장바구니** — QR로 카트 연결, SSE로 담긴 상품·합계 실시간 수신, (재)접속 시 현재 장바구니 동기화, 수량 ±·삭제
- **토스페이먼츠 결제** — 주문 생성 → 결제 시도 → 토스 결제창(WebView) → 승인 → 완료
- **결제 영수증** — QR + 주문 내역 영수증, "상품 외 N개" 요약·상세 보기, **이미지로 사진 앨범 저장**
- **상품 카탈로그(하이브리드)** — 백엔드 상품(id·바코드·이름·가격·카테고리·상태)에 앱 로컬 표현(아이콘·매대 구역·할인·재고)을 얹어 상품 보기·상세·매장 지도 제공
- **관리자** — 관리자 로그인(JWT role), 상품 등록/수정(백엔드 연동), 매장 지도 편집
- **접근성** — 일반인 / 노약자 2가지 모드 (글자·터치·대비·음성)

## 🧱 기술 스택

| 기술 | 역할 |
|------|------|
| React Native + Expo (SDK 54) | 크로스플랫폼 앱 기반 |
| Expo Router v3 | 파일 기반 라우팅 (`src/app/`) |
| TypeScript (strict) | 전체 타입 적용 |
| Context + useReducer | 전역 상태 (인증·카탈로그·카트·모드) |
| Custom fetch wrapper | JWT 자동 첨부·401 자동 재발급·에러 공통 처리 (**Axios 미사용**) |
| SSE (`react-native-sse`) | Spring Boot → 앱 단방향 실시간 수신 (**WebSocket 미사용**) |
| `react-native-webview` | 토스페이먼츠 결제창 |
| `react-native-view-shot` + `expo-media-library` | 영수증 캡처·저장 |
| `expo-speech` | 노약자 모드 음성 안내 |
| `expo-camera` / `expo-secure-store` | QR·바코드 스캔 / 토큰 저장 |

**배제 라이브러리**: Axios · TanStack Query · Zustand · Redux · WebSocket

## 📱 화면 구성

| 화면 | 기능 | 통신 |
|------|------|------|
| 로그인 / 회원가입 | 이메일 인증 → 가입 → 모바일 로그인 | REST |
| 홈 | 허브 — 쇼핑 시작/계속·상품·지도·마이페이지·(관리자) | — |
| 카트 연결 | QR 스캔 / 코드 직접 입력 → 세션 연결 | REST |
| 장바구니 | 상품·합계 실시간, 수량 ±·삭제·반납 | SSE + REST |
| 결제 확인 | 주문 생성 → 토스 결제창 | REST + WebView |
| 결제 완료 | QR + 주문내역 영수증, 이미지 저장, 세션 종료 | — |
| 상품 보기 / 상세 | 검색·구역 필터·정렬, 상세(가격·재고·위치) | REST |
| 매장 지도 | 매대 구역별 상품 | — |
| 마이페이지 | 내 정보·접근성 설정·로그아웃 | — |
| 관리자 | 대시보드·상품 등록/수정·매장 지도 편집 | REST |

## ♿ 접근성: 일반인 / 노약자 모드

전역 `ModeContext`의 `mode: 'normal' | 'senior'` (기본 `normal`). 토글은 로그인 화면·마이페이지.
두 모드는 **기능 동일**, 글자·간격·대비·음성만 다르며 화면은 한 벌만 만들고 `theme[mode]` 토큰에서 읽습니다.

| 요소 | normal | senior |
|------|--------|--------|
| 본문 / 버튼 / 제목 | 15 / 18 / 24pt | 18 / 24 / 30pt |
| 터치 영역 | 44px | 56px+ |
| 색 대비 | 표준 | WCAG AA (4.5:1) |
| 음성 안내 | 생략 | 상품 담김·결제 완료 안내 |

## 📂 폴더 구조

```
src/
  app/          # 라우트 (login·signup·home·mypage·connect·cart·checkout·complete·
                #        products·product/[id]·map·admin/*)
  components/   # Card·PrimaryButton·TextField·StoreMap·TossPaymentModal·ModeToggle
  context/      # Auth·Catalog·CartSession·Cart·Mode Provider
  theme/        # tokens.ts (normal / senior 두 벌)
  lib/          # api.ts(fetch wrapper)·sse.ts·speak.ts·catalog/overlay.ts·*Storage.ts
```

## 🚀 시작하기

```bash
npm install
npx expo start          # Expo Go로 QR 스캔해 실행
```

루트에 `.env` 설정 (실기기는 같은 네트워크의 백엔드 주소):

```bash
EXPO_PUBLIC_API_BASE_URL=http://<백엔드-IP>:8081
EXPO_PUBLIC_USE_MOCK=false
```

> RN에는 기본 `EventSource`가 없어 SSE는 `react-native-sse` 폴리필을 사용합니다.

## 🛠 개발

- 브랜치: `main` 기준, 기능별 `feat/*` 브랜치 → PR → 머지
- 코드 컨벤션·이슈/PR 템플릿: [`CartrAIder/.github`](https://github.com/CartrAIder/.github)
- 백엔드: [`CartrAIder/quickPass`](https://github.com/CartrAIder/quickPass)

## 👥 팀

팀 카트라이더 · 프론트엔드 — 최수환, 김도영
