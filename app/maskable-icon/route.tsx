import { ImageResponse } from "next/og";
import { OgFitTrackBrand } from "@/lib/og-fittrack-brand";
import { loadDmSans700ForOg } from "@/lib/og-font-dm-sans-700";

export const runtime = "nodejs";

/** Manifest `maskable-icon` — mark + wordmark inside adaptive-icon safe zone. */
export async function GET() {
  const size = 512;
  const dmSans = await loadDmSans700ForOg();
  return new ImageResponse(
    <OgFitTrackBrand
      canvas={size}
      markSize={112}
      tileRadius={18}
      wordmarkPx={48}
      gap={12}
      padding={56}
    />,
    {
      width: size,
      height: size,
      fonts: [{ name: "DM Sans", data: dmSans, style: "normal", weight: 700 }],
    },
  );
}
