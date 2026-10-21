"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export function SizePicker({ sizes, className }: { sizes: string[]; className?: string }) {
  const id = useId();
  const [value, setValue] = useState(sizes.length === 1 ? sizes[0] : "");
  if (!sizes.length) return null;
  return (
    <fieldset className={className}>
      <legend className="eyebrow text-[0.6rem] text-mute-2">Size</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {sizes.map((s) => (
          <label key={s} className="cursor-pointer">
            <input
              type="radio"
              name={id}
              value={s}
              checked={value === s}
              onChange={() => setValue(s)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex h-11 min-w-11 items-center justify-center border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-colors peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-gold-300",
                value === s ? "border-gold-300 bg-gold-400 text-ink-950" : "border-white/20 text-white hover:border-white/60",
              )}
            >
              {s}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
