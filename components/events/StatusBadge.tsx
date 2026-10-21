import type { EventStatus } from "@/lib/cms/types";
import { cn, statusLabel } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  const live = status === "on-sale" || status === "few-left";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap border px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.25em]",
        live ? "border-gold-400/50 text-gold-300" : "border-white/20 text-white/70",
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {live && <span className="absolute inset-0 animate-ping rounded-full bg-gold-300 opacity-70" />}
        <span className={cn("relative h-1.5 w-1.5 rounded-full", live ? "bg-gold-300" : "bg-white/50")} />
      </span>
      {statusLabel[status]}
    </span>
  );
}
