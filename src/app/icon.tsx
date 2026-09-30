import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_COLOR } from "@/lib/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// 소문자 c 는 x-height 글리프라 줄 상자 가운데에 두면 아래로 처진다. 글리프 높이 기준으로 끌어올린다.
const FONT_SCALE = 1.1;
const LIFT = 0.083;

export default async function Icon() {
  const font = await readFile(join(process.cwd(), "src/assets/fonts/Nunito-Black.ttf"));
  const fontSize = size.width * FONT_SCALE;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_COLOR.brand,
          borderRadius: "22%",
          color: BRAND_COLOR.onBrand,
          fontFamily: "Nunito",
          fontWeight: 900,
          fontSize,
          lineHeight: 1,
        }}
      >
        <div style={{ display: "flex", position: "relative", top: -fontSize * LIFT }}>c</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Nunito", data: font, weight: 900, style: "normal" }] },
  );
}
