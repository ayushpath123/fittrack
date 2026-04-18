type MeshVariant = "blue" | "green" | "purple" | "fittrack";

type Blob = {
  size: number;
  color: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  delay: string;
};

const configs: Record<MeshVariant, Blob[]> = {
  /** Onboarding-aligned ambient orbs */
  fittrack: [
    { size: 380, color: "rgba(190,255,71,.055)", top: "-120px", left: "-120px", delay: "0s" },
    { size: 320, color: "rgba(74,126,255,.07)", bottom: "-100px", right: "-100px", delay: "-5s" },
    { size: 220, color: "rgba(87,180,255,.05)", top: "40%", left: "-40px", delay: "-9s" },
  ],
  blue: [
    { size: 340, color: "rgba(190,255,71,.18)", top: "-80px", left: "-80px", delay: "0s" },
    { size: 260, color: "rgba(167,139,250,.12)", top: "60px", right: "-60px", delay: "-4s" },
    { size: 200, color: "rgba(45,212,160,.10)", bottom: "80px", left: "40px", delay: "-8s" },
  ],
  green: [
    { size: 300, color: "rgba(45,212,160,.16)", top: "-60px", right: "-60px", delay: "-2s" },
    { size: 220, color: "rgba(190,255,71,.10)", bottom: "100px", left: "-40px", delay: "-6s" },
  ],
  purple: [
    { size: 320, color: "rgba(167,139,250,.18)", top: "-80px", left: "-60px", delay: "-3s" },
    { size: 200, color: "rgba(190,255,71,.10)", bottom: "60px", right: "20px", delay: "-7s" },
  ],
};

export function MeshBackground({ variant = "fittrack" }: { variant?: MeshVariant }) {
  return (
    <>
      {configs[variant].map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: b.size,
            height: b.size,
            borderRadius: "50%",
            background: b.color,
            filter: "blur(80px)",
            pointerEvents: "none",
            top: b.top,
            left: b.left,
            right: b.right,
            bottom: b.bottom,
            animation: `mesh-drift 12s ease-in-out ${b.delay} infinite`,
            zIndex: 0,
          }}
        />
      ))}
    </>
  );
}
