import { ReactNode } from "react";

export function PageScreen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 28,
        padding: "28px 20px 100px",
        background: "#141420",
        minHeight: "100dvh",
      }}
    >
      {children}
    </div>
  );
}
