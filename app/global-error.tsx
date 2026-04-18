"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 18 }}>FitTrack — something went wrong</h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>Please reload the app.</p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 16,
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
