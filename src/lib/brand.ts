// 화면에 노출되는 서비스명·사이트 주소. 서비스명 표기는 항상 소문자.
export const BRAND = { name: "concertrip", siteUrl: "https://concertrip.kr" } as const;

// CSS 를 쓸 수 없는 곳(파비콘 ImageResponse 등)에서 쓰는 브랜드 색. globals.css 의 --palette-brand / --palette-on-brand 와 같은 값.
export const BRAND_COLOR = { brand: "#FF004F", onBrand: "#FFFFFF" } as const;
