import { ImageResponse } from "next/og";
import { OgFitTrackBrand } from "@/lib/og-fittrack-brand";
import { loadDmSans700ForOg } from "@/lib/og-font-dm-sans-700";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home screen — `AppBrand` layout (mark + wordmark). */
export const runtime = "nodejs";

export default async function AppleIcon() {
  const dmSans = await loadDmSans700ForOg();
  return new ImageResponse(
    <OgFitTrackBrand canvas={180} markSize={40} tileRadius={9} wordmarkPx={20} gap={4} padding={7} />,
    {
      ...size,
      fonts: [{ name: "DM Sans", data: dmSans, style: "normal", weight: 700 }],
    },
  );
}
