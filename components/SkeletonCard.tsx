export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="premium-card rounded-2xl p-4">
      <div
        className="mb-3 h-4 w-24 rounded"
        style={{
          background: "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s infinite",
        }}
      />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded"
            style={{
              background: "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)",
              backgroundSize: "200% 100%",
              animation: `shimmer 1.4s infinite ${i * 60}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonRing() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 32, padding: "8px 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)",
              backgroundSize: "200% 100%",
              animation: `shimmer 1.4s infinite ${i * 80}ms`,
            }}
          />
          <div
            style={{
              width: 48,
              height: 10,
              borderRadius: 99,
              background: "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)",
              backgroundSize: "200% 100%",
              animation: `shimmer 1.4s infinite ${i * 80 + 100}ms`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div style={{ padding: "12px 0" }}>
      {[100, 70, 85, 50, 90].map((h, i) => (
        <div key={i} style={{ display: "inline-block", width: "16%", margin: "0 1%", verticalAlign: "bottom" }}>
          <div
            style={{
              height: h * 0.6,
              borderRadius: "6px 6px 0 0",
              background: "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)",
              backgroundSize: "200% 100%",
              animation: `shimmer 1.4s infinite ${i * 60}ms`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
