interface MealCardItem {
  emoji: string;
}

interface MealCardProps {
  mealType: string;
  items: MealCardItem[];
  description: string;
  calories: number;
  protein: number;
  time?: string;
  color: "amber" | "blue" | "green" | "purple";
  onEdit?: () => void;
  onDelete?: () => void;
}

const colorThemes = {
  amber: { from: "#1a0a00", to: "#3d1a00", overlay: "rgba(255,181,71,.22)", text: "#FFB547" },
  blue: { from: "#00091a", to: "#001a3d", overlay: "rgba(190,255,71,.18)", text: "#BEFF47" },
  green: { from: "#001a0d", to: "#003320", overlay: "rgba(45,212,160,.18)", text: "#2DD4A0" },
  purple: { from: "#0d0020", to: "#1a0040", overlay: "rgba(167,139,250,.18)", text: "#A78BFA" },
} as const;

export function MealCard({ items, description, calories, protein, time, color, onEdit, onDelete }: MealCardProps) {
  const t = colorThemes[color];
  return (
    <div
      className="premium-card overflow-hidden border"
      style={{ borderColor: t.overlay, background: "rgba(255,255,255,.04)" }}
    >
      <div style={{ padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#F4F4FF", marginBottom: 3 }}>{description}</p>
          <p style={{ fontSize: 11, color: "rgba(244,244,255,.45)" }}>{items.length} items</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="num" style={{ fontSize: 16, fontWeight: 800, color: "#F4F4FF" }}>
            {Math.round(calories)}
          </p>
          <p style={{ fontSize: 10, color: "rgba(244,244,255,.45)" }}>{Math.round(protein)}g protein</p>
        </div>
      </div>
      {(onEdit || onDelete || time) && (
        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          {time ? <span className="num text-[11px] font-semibold text-[var(--muted)]">{time}</span> : <span />}
          <div className="flex justify-end gap-2">
          {onEdit ? (
            <button onClick={onEdit} className="rounded-lg border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.12)] px-2.5 py-1 text-[11px] font-semibold text-[#BEFF47]">
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button onClick={onDelete} className="rounded-lg border border-[rgba(255,92,122,.35)] bg-[rgba(255,92,122,.12)] px-2.5 py-1 text-[11px] font-semibold text-[#FF5C7A]">
              Delete
            </button>
          ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
