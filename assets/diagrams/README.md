# 다이어그램

README에 들어가는 시스템 그림입니다. Mermaid 대신 손으로 쓴 SVG를 쓰는 이유는,
GitHub의 Mermaid 렌더러가 노드 안에 이미지(로고)를 넣는 것을 지원하지 않기 때문입니다.

| 파일 | 내용 |
|---|---|
| `architecture.svg` | 카트 모듈 · AI 게이트 · 서버 · 앱 · 결제까지 전체 구성 |
| `realtime-sequence.svg` | 스캔 → MQTT → SSE → 화면 반영 시퀀스 |
| `icons/*.svg` | README 본문에서 인라인으로 쓰는 기술 로고 |

## 수정

평범한 SVG라 에디터에서 바로 열어 고치면 됩니다. 색은 앱 디자인 토큰
(`src/theme/tokens.ts`)과 맞춰져 있습니다 — Primary `#2563EB`, Accent `#16A34A`,
Ink `#111827`, Border `#E6E9EF`. 앱 노드에는 `assets/logo/mark-white.svg`를 그대로 넣었습니다.

## 로고 출처

기술 스택 로고는 [Simple Icons](https://simpleicons.org) (CC0 1.0)에서 가져와 각
브랜드 공식 색을 입혔습니다. 상표권은 각 권리자에게 있으며, 여기서는 기술 스택을
가리키는 용도로만 사용합니다.
