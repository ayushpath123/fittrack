"use client";

interface ProgressBarProps {
  progress: number; // 0-100
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="absolute left-0 right-0 top-0 h-[3px] overflow-hidden rounded-t-[26px] bg-white/[0.07]">
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-[#BEFF47] to-[#8BF000] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
