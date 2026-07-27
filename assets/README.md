# CartrAIder 브랜드 애셋 (2b · 에이아이봇)

확정안: 카트에 손을 얹고 탑승한 AI 로봇 마스코트.

## 컬러
| 역할 | HEX | 비고 |
|---|---|---|
| Primary | `#2563EB` | tokens.normal.colors.primary |
| Primary (senior) | `#1D4ED8` | 고대비 모드 |
| Accent (안테나) | `#16A34A` | tokens.colors.success |
| Accent on blue | `#7DD3A0` | 파란 배경 위 안테나 |
| Ink | `#111827` | 눈·워드마크 |

워드마크: Plus Jakarta Sans 700 / `AI`만 800 + Primary.

## 파일

### 앱 아이콘 (Expo · `assets/images/`)
| 파일 | 크기 | 용도 |
|---|---|---|
| `icon.png` | 1024 | iOS/기본 앱 아이콘 (블루 풀블리드) |
| `android-icon-foreground.png` | 1024 | Android 적응형 전경 (투명, 66% 세이프존 내) |
| `android-icon-background.png` | 1024 | Android 적응형 배경 (단색 #2563EB) |
| `android-icon-monochrome.png` | 1024 | Android 13+ 테마 아이콘 (흰 실루엣, 눈 투명) |
| `splash-icon.png` | 512 | 스플래시 (투명, imageWidth 76~120) |
| `favicon.png` | 64 | expo web |
| `notification-icon.png` | 256 | 알림 (흰 실루엣) |

### 벡터 원본 (`assets/logo/`)
`mark-color.svg` · `mark-white.svg` · `mark-mono.svg`
`lockup-color.svg` · `lockup-white.svg` · `lockup-mono.svg` · `lockup-stacked.svg`
`app-icon.svg` (1024 라운드 스퀘어) · `mark-color-512.png` · `mark-white-512.png`

> SVG 워드마크는 `<text>`로 되어 있습니다. 배포용으로 고정하려면 Figma/Illustrator에서 outline 처리하세요.

## app.json 적용

```json
{
  "expo": {
    "icon": "./assets/images/icon.png",
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#2563EB",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      }
    },
    "web": { "favicon": "./assets/images/favicon.png" },
    "plugins": [
      ["expo-splash-screen", {
        "backgroundColor": "#2563EB",
        "image": "./assets/images/splash-icon.png",
        "imageWidth": 120
      }]
    ]
  }
}
```

변경점 2가지: 적응형 배경색 `#E6F4FE` → `#2563EB`, 스플래시 배경 `#208AEF` → `#2563EB` (토큰 통일).
`ios.icon: "./assets/expo.icon"` 항목은 제거하고 `icon`만 쓰면 됩니다.

## 사용 규칙
- 최소 여백 = 심볼 높이의 25%.
- 심볼 단독 최소 20px, 가로 락업 최소 폭 120px.
- 아이콘 배경은 단색 블루만. 그라디언트·그림자·외곽선 추가 금지.
- 노약자(senior) 모드 화면에서는 `#1D4ED8` 버전 사용 (대비 4.5:1).
- 마스코트 변형(표정·소품)은 눈 위치와 머리 radius를 유지할 것.
