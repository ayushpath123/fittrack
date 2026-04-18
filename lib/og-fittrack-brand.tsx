/**
 * PWA / OG icon layout — matches `AppBrand`: lime tile + activity stroke + bold wordmark on app base.
 * Caller must pass `fonts: [{ name: "DM Sans", data, weight: 700, style: "normal" }]` into `ImageResponse`.
 */
export function OgFitTrackBrand({
  canvas,
  markSize,
  tileRadius,
  wordmarkPx,
  gap,
  padding = 0,
}: {
  canvas: number;
  markSize: number;
  tileRadius: number;
  wordmarkPx: number;
  gap: number;
  padding?: number;
}) {
  const iconPx = Math.round(markSize * 0.58);
  return (
    <div
      style={{
        width: canvas,
        height: canvas,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#08090F",
        padding,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap,
        }}
      >
        <div
          style={{
            width: markSize,
            height: markSize,
            borderRadius: tileRadius,
            background: "#BEFF47",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width={iconPx}
            height={iconPx}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22 12h-4l-3 9L9 3l-3 9H2"
              stroke="#06080A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            color: "#f4f4ff",
            fontFamily: "DM Sans",
            fontSize: wordmarkPx,
            fontWeight: 700,
            letterSpacing: wordmarkPx * -0.02,
            lineHeight: 1,
          }}
        >
          FitTrack
        </div>
      </div>
    </div>
  );
}
