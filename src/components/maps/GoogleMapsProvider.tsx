"use client";

/**
 * GoogleMapsProvider
 * 같은 페이지에서 PlaceSearchInput + MapPreview를 함께 쓸 때
 * 이 Provider 하나로 감싸면 APIProvider를 공유할 수 있습니다.
 *
 * 단독 사용 시에는 각 컴포넌트가 내부적으로 APIProvider를 포함하므로
 * 이 Provider를 별도로 쓰지 않아도 됩니다.
 */

import { APIProvider } from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  if (!API_KEY) return <>{children}</>;
  return <APIProvider apiKey={API_KEY}>{children}</APIProvider>;
}
