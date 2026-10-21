import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Gold eyebrow with a trailing hairline — used to open every section. */
export function SectionLabel({
  children,
  className,
  index,
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  index?: string;
  align?: "left" | "center";
}) {
  return (
    <p
      className={cn(
        "eyebrow flex items-center gap-4 text-gold-400",
        align === "center" && "justify-center",
        className,
      )}
    >
      {index && <span className="text-mute-2">{index}</span>}
      {align === "center" && <span aria-hidden className="h-px w-10 bg-gradient-to-r from-transparent to-gold-500/70" />}
      <span>{children}</span>
      <span aria-hidden className={cn("h-px bg-gold-500/60", align === "center" ? "w-10 bg-gradient-to-l from-transparent to-gold-500/70 bg-transparent" : "w-12")} />
    </p>
  );
}
