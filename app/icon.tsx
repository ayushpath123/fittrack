import { ImageResponse } from "next/og";
import { OgFitTrackBrand } from "@/lib/og-fittrack-brand";
import { loadDmSans700ForOg } from "@/lib/og-font-dm-sans-700";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

/** PWA / favicon — `AppBrand` layout (mark + wordmark). */
export const runtime = "nodejs";

export default async function Icon() {
  const dmSans = await loadDmSans700ForOg();
  return new ImageResponse(
    <OgFitTrackBrand canvas={192} markSize={44} tileRadius={10} wordmarkPx={22} gap={5} padding={8} />,
    {
      ...size,
      fonts: [{ name: "DM Sans", data: dmSans, style: "normal", weight: 700 }],
    },
  );
}
