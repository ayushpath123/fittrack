"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TemplateScrollRowProps = {
  itemCount: number;
  label?: string;
  children: React.ReactNode;
  className?: string;
};

export function TemplateScrollRow({ itemCount, label, children, className }: TemplateScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [overflow, setOverflow] = useState(false);

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setOverflow(el.scrollWidth > el.clientWidth + 4);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || itemCount === 0) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement;
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(center - childCenter);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    setActiveIdx(closest);
  }, [itemCount]);

  useEffect(() => {
    updateOverflow();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);
    return () => ro.disconnect();
  }, [itemCount, updateOverflow]);

  function scrollToIndex(idx: number) {
    const el = scrollRef.current;
    const child = el?.children[idx] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  return (
    <div className={className}>
      {label ? (
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-[var(--hint)]">{label}</p>
      ) : null}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex gap-2 overflow-x-auto scroll-smooth pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {overflow && itemCount > 1 ? (
        <div className="mt-1.5 flex items-center justify-center gap-1" role="tablist" aria-label="More templates">
          {Array.from({ length: itemCount }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeIdx}
              aria-label={`Go to template ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              className={cn(
                "rounded-full transition-all",
                i === activeIdx ? "h-1.5 w-3 bg-[#BEFF47]" : "h-1.5 w-1.5 bg-white/25 hover:bg-white/40",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
