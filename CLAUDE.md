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
- 토글은 **로그인 화면(로그인 전 접근용)과 마이페이지(설정)** 에 둔다. 선택하면 secure-store에 저장돼 유지된다.
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

플로우: **로그인/회원가입 → 홈(허브) → [쇼핑 시작] 카트 QR 연결 → 장바구니 → 결제 → 홈**.
홈에서 상품 보기·매장 지도·마이페이지 등을 선택해 흐름을 시작한다.
(매장 길 안내 화면은 제거됐다 — 경로 표시는 상품 상세의 위치 지도가 대신한다.)
회원 세션(로그인)과 카트 세션(QR)은 분리돼 있고, 둘 다 secure-store에 저장되어
앱을 나갔다 돌아와도 복원된다(홈의 "쇼핑 계속하기"로 이어하기).

```
src/
  app/
    _layout.tsx        # 루트 Stack + Mode/Catalog/Auth/CartSession/Cart Provider
    index.tsx          # 라우팅 게이트 (미로그인 → /login · 로그인 → /home)
    login.tsx          # 로그인 + 모드 토글 (토글은 여기·마이페이지) + 비밀번호 찾기 진입
    signup.tsx         # 회원가입 (이메일 인증 → 가입 → 자동 로그인, 항상 일반 회원)
    password-reset.tsx # 비밀번호 찾기(비로그인) — 이메일 → 인증번호 → 새 비밀번호 3단계
    home.tsx           # 홈 허브 — 쇼핑 시작/계속·메뉴 4종·오늘의 할인·(관리자만) 관리자 진입
    mypage.tsx         # 마이페이지 — 내 정보·접근성 설정·메뉴·계정·로그아웃
    password-change.tsx # 비밀번호 변경(로그인 상태) — 성공 시 세션 토큰 교체
    withdraw.tsx       # 회원 탈퇴 — 비밀번호 재확인 + 확인 다이얼로그
    connect.tsx        # (1) 카트 연결 (QR 스캔·코드 입력)
    cart.tsx           # (2) 장바구니 (SSE 실시간)
    checkout.tsx       # (3) 결제 확인 (1탭)
    complete.tsx       # (4) 결제 완료 (QR 영수증·음성)
    map.tsx            # (5) 매장 지도 — 구역 탭 → 해당 구역 상품
    products.tsx       # (6) 상품 보기 — 검색·구역 필터·정렬·할인만
    product/[id].tsx   # (7) 상품 상세 — 가격·재고·위치 지도·같은 구역 상품
    admin/
      _layout.tsx      # 관리자 라우트 가드 (미로그인 → /login · 일반 회원 → /home)
      index.tsx        # 관리자 대시보드 — 통계·경고·관리 메뉴·데이터 초기화
      orders.tsx       # 주문 관리 — 검색·상태 필터·페이징 (조회 전용)
      order/[orderId].tsx # 주문 상세 — 고객·주문 상품·이력 (조회 전용)
      products.tsx     # 상품 관리 — 목록·검색·재고 ±·수정·삭제
      product-form.tsx # 상품 등록/수정 폼 (?id= 있으면 수정)
      map.tsx          # 매장 지도 편집 — 구역 배치(스왑)·이름·아이콘·색상
  components/
    Card.tsx           # 흰 카드 (그림자/테두리·radius 토큰)
    PrimaryButton.tsx  # 블루/그린 CTA 버튼 (loading·variant)
    TextField.tsx      # 라벨 있는 채움형 입력창 (포커스 강조·비밀번호 토글)
    ModeToggle.tsx     # 큰 글자·고대비 토글 (로그인 화면·마이페이지)
    StoreMap.tsx       # 매장 평면도 SVG — 지도·상품 상세·관리자 편집이 공유
    TossPaymentModal.tsx # 토스 결제창 WebView (paymentKey 획득)
    OrderStatusBadge.tsx # 주문 상태 배지 — 관리자 주문 목록·상세 공용
  context/
    ModeContext.tsx        # mode: 'normal' | 'senior' (기본 normal)
    CatalogContext.tsx     # 상품·매장 구역 (관리자 CRUD) — 영속화
    AuthContext.tsx        # 회원 로그인/회원가입 세션 (JWT·role)
    CartSessionContext.tsx # 카트 연결(cartId) 세션 — 영속화
    CartContext.tsx        # 장바구니 상태 (useReducer) — 영속화
  theme/
    tokens.ts          # normal / senior 두 벌 (글자·색·그림자·radius·CTA)
  lib/
    api.ts             # custom fetch wrapper (회원 JWT 자동 첨부) + 전 엔드포인트 호출부
    sse.ts             # SSE(react-native-sse) 연결
    authStorage.ts     # 회원 세션 저장 (secure-store, role 포함)
    cartStorage.ts     # 카트 세션·장바구니 저장 (secure-store)
    catalogStorage.ts  # 카탈로그 저장 (secure-store, 2KB 제한 회피용 청크 분할)
    catalog/overlay.ts # 서버 상품 + 로컬 표현 오버레이 병합
    format.ts          # 표시용 포맷 (날짜·금액)
    confirm.ts         # 크로스플랫폼 확인 다이얼로그 (웹은 window.confirm)
    speak.ts           # 음성 안내 (senior 모드)
    mock/products.ts   # 상품 시드 (18종) — CatalogContext의 초기값
    mock/storeMap.ts   # 매장 구역 시드 (6매대 + 계산대)
```

> 앱 코드는 `CartrAIder/frontend` 레포에 있다. 이 디렉터리(`창의공학설계`)는 기획/문서 공간이다.

---

## 관리자 계정 · 매장 카탈로그

- 회원 세션에 `role: 'user' | 'admin'`이 있다. **회원가입으로 만든 계정은 항상 `user`**이고,
  `admin` 여부는 로그인 시 받은 액세스 토큰(JWT)의 `role` 클레임에서 읽는다. 관리자 계정은
  백엔드가 시드로 넣어준다(`admin@cartraider.com`). 앱에 하드코딩된 관리자 계정은 없다.
- 관리자 진입점은 **홈 상단 배너와 마이페이지 메뉴** 두 곳이며, 둘 다 `isAdmin`일 때만 보인다.
  딥링크 대비로 `app/admin/_layout.tsx`가 라우트 가드를 한 번 더 건다.
- 상품·매장 구역은 **`CatalogContext` 한 곳**이 소유한다. 고객 화면(상품 보기·지도·
  오늘의 할인)과 관리자 화면이 같은 데이터를 보므로, 화면에서 `mock/products.ts`를 직접
  import하지 말고 `useCatalog()`를 쓴다. mock 배열은 최초 1회 채우는 **시드**일 뿐이다.
- 상품은 **하이브리드**다. 백엔드 `Product`는 `barcode·name·price·category·status` 5개뿐이라,
  재고·구역·아이콘·할인은 barcode 기준 로컬 오버레이로만 보관한다. 재고는 0 여부만
  판매상태(`ON_SALE`/`SOLD_OUT`)로 서버에 전달된다. 이름·카테고리는 서버 수정 API가 없다.
- 매장 평면도는 `components/StoreMap.tsx` 하나만 쓴다(지도·상품 상세·관리자 편집 공용).
  좌표 상수(`COL_X`·`ROW_Y`·`buildRoute` 등)도 이 파일에서 export한다. 화면마다 SVG를 새로 그리지 말 것.
- 매대는 **2행 × 3열 = 6칸** 고정이다(row 2는 계산대). 구역 추가·이동은 이 6칸 안에서만 가능하다.

---

## 코딩 규칙

- 언어: 코드 주석·커밋 메시지는 한국어 허용, 식별자는 영어.
- 스타일: 기존 파일의 컨벤션(들여쓰기·네이밍·주석 밀도)을 그대로 따른다.
- 하드코딩된 폰트 크기/색상/그림자/radius 금지 → 반드시 `theme[mode]` 토큰 사용.
- 비주얼: "Toss Blue"(흰 카드·은은한 그림자·넉넉한 여백·파랑 브랜드). 카드/버튼/입력은
  `components/`의 `Card`·`PrimaryButton`·`TextField`를 재사용한다(화면마다 새로 만들지 말 것).
- API base URL, SSE 엔드포인트 등은 상수/환경변수로 분리한다.
- 백엔드 API 명세 미확정 부분(SSE 인증 방식 등)은 TODO로 표시하고 목(mock)으로 개발.

---

## 개발 진행 방식

- 스프린트 계획은 `docs/SPRINTS.md`에 있다. 스프린트 순서대로 진행한다.
- 각 스프린트/작업은 **사용자 확인 후** 진행한다. 임의로 다음 스프린트로 넘어가지 않는다.
