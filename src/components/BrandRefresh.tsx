import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';

/**
 * 당겨서 새로고침 공용 훅.
 *
 * 화면마다 refreshing 상태·에러 처리·인디케이터 색을 따로 만들지 않도록 한 곳에 모은다.
 * 플랫폼 기본 인디케이터(iOS 스피너 / Android 원형)는 투명하게 숨기고, 대신 목록 맨 위에
 * `BrandRefreshLoader`(공용 브랜드 로더의 컴팩트 변형)를 띄운다 — 앱 전체가 같은 로딩 표현을
 * 쓰게 하려는 것이다. 당기는 동안의 피드백은 리스트 자체의 바운스/오버스크롤이 담당한다.
 *
 * 사용법:
 *   const { refreshing, refreshControl } = useBrandRefresh(reload);
 *   <ScrollView refreshControl={refreshControl}>
 *     <BrandRefreshLoader visible={refreshing} />
 *     …
 */
export function useBrandRefresh(onRefresh: () => Promise<unknown> | unknown) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } catch {
      // 실패 표시는 각 화면이 이미 하고 있다(에러 박스·마지막 캐시 유지).
      // 여기서 삼키지 않으면 새로고침이 끝나지 않은 것처럼 보인다.
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      // 기본 인디케이터를 숨긴다 — 화면에는 BrandRefreshLoader 하나만 보이게.
      tintColor="transparent"
      colors={['transparent']}
      progressBackgroundColor="transparent"
    />
  );

  return { refreshing, refreshControl };
}
