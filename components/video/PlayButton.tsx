import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

/** Circular play button with a rotating text ring and gold pulse on hover. */
export function PlayButton({
  className,
  ring = "Watch the vibe • Bombita NYC • ",
  size = "lg",
}: {
  className?: string;
  ring?: string;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "h-32 w-32 md:h-40 md:w-40" : "h-14 w-14";
  return (
    <span className={cn("group/play relative inline-flex items-center justify-center", dim, className)}>
      {size === "lg" && (
        <svg viewBox="0 0 100 100" className="animate-spin-slow absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <path id="play-ring" d="M50,50 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0" />
          </defs>
          <text className="fill-white/80 text-[7.4px] font-semibold uppercase tracking-[0.34em]">
            <textPath href="#play-ring">{ring}</textPath>
          </text>
        </svg>
      )}
      <span
        className={cn(
          "relative flex items-center justify-center rounded-full border border-white/40 bg-ink-950/30 backdrop-blur-sm transition-all duration-700 ease-[var(--ease-expo)] group-hover/play:scale-110 group-hover/play:border-gold-300 group-hover/play:bg-gold-400",
          size === "lg" ? "h-16 w-16 md:h-20 md:w-20" : "h-full w-full",
        )}
      >
        <span className="absolute inset-0 rounded-full border border-gold-300 opacity-0 transition-opacity duration-500 group-hover/play:animate-ping group-hover/play:opacity-60" />
        <Play
          className={cn(
            "ml-0.5 fill-current text-white transition-colors duration-500 group-hover/play:text-ink-950",
            size === "lg" ? "h-5 w-5" : "h-4 w-4",
          )}
        />
      </span>
    </span>
  );
}
