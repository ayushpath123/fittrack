interface StatBannerProps {
  label: string;
  color: "blue" | "green" | "amber";
  stats: { value: string; sub: string }[];
}

const bannerColors = {
  blue: { from: "rgba(190,255,71,.14)", to: "rgba(87,180,255,.08)", border: "rgba(190,255,71,.22)", label: "rgba(190,255,71,.85)" },
  green: { from: "rgba(45,212,160,.14)", to: "rgba(190,255,71,.08)", border: "rgba(45,212,160,.22)", label: "rgba(45,212,160,.8)" },
  amber: { from: "rgba(255,181,71,.14)", to: "rgba(255,92,122,.08)", border: "rgba(255,181,71,.22)", label: "rgba(255,181,71,.8)" },
} as const;

export function StatBanner({ label, color, stats }: StatBannerProps) {
  const c = bannerColors[color];
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
        border: `1px solid ${c.border}`,
        borderRadius: 20,
        padding: "16px 18px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", right: -20, top: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: c.label, marginBottom: 12 }}>{label}</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {stats.map((s) => (
          <div key={s.sub}>
            <p className="num" style={{ fontSize: 24, fontWeight: 800, color: "#F4F4FF" }}>
              {s.value}
            </p>
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
