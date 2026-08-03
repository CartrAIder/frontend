/**
 * 음성 안내(TTS) 헬퍼 — expo-speech 위에 얇게 얹어 "더 자연스러운" 한국어 음성을 낸다.
 *
 * 자연스러움의 가장 큰 요인은 OS에 설치된 음성 품질이다. 이 헬퍼는 기기에서 사용 가능한
 * 한국어 음성 중 **향상된(Enhanced/Premium) 음질**을 자동으로 골라 쓰고, 속도·톤을
 * 살짝 다듬는다. (iOS는 설정 › 손쉬운 사용 › 콘텐츠 말하기 › 음성 › 한국어에서
 * 향상된 음성을 내려받으면 체감이 크게 좋아진다.)
 */
import * as Speech from 'expo-speech';

// undefined = 아직 조회 안 함, null = 적합한 음성 없음(기본 음성 사용)
let cachedVoiceId: string | null | undefined;

async function resolveKoreanVoice(): Promise<string | null> {
  if (cachedVoiceId !== undefined) return cachedVoiceId;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const korean = voices.filter((v) => v.language?.toLowerCase().startsWith('ko'));
    // 향상된 음질 우선 → 없으면 첫 한국어 음성.
    const enhanced = korean.find((v) => String(v.quality).toLowerCase().includes('enhanced'));
    cachedVoiceId = (enhanced ?? korean[0])?.identifier ?? null;
  } catch {
    cachedVoiceId = null;
  }
  return cachedVoiceId;
}

/**
 * 한국어로 자연스럽게 읽어준다. 이전 발화는 끊고 새로 읽는다(겹침 방지).
 * rate 0.96 — 기본보다 살짝 또박또박(노약자 대비)하지만 부자연스럽지 않게.
 */
export async function speakKo(text: string): Promise<void> {
  const voice = await resolveKoreanVoice();
  Speech.stop();
  Speech.speak(text, {
    language: 'ko-KR',
    voice: voice ?? undefined,
    rate: 0.96,
    pitch: 1.02,
  });
}

/** 진행 중인 음성을 멈춘다(화면 이탈 시 정리). */
export function stopSpeaking(): void {
  Speech.stop();
}
