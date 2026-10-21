import { cn } from "@/lib/utils";

/** Infinite editorial ticker. Duplicates content for a seamless loop. */
export function Marquee({
  items,
  className,
  duration = 40,
  reverse,
  starClassName = "text-gold-400",
}: {
  items: string[];
  className?: string;
  duration?: number;
  reverse?: boolean;
  starClassName?: string;
}) {
  const row = (
    <ul className="flex shrink-0 items-center" aria-hidden>
      {items.map((t, i) => (
        <li key={i} className="flex items-center">
          <span className="px-6 md:px-10">{t}</span>
          <span className={starClassName}>✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn("relative flex overflow-hidden whitespace-nowrap", className)}>
      <span className="sr-only">{items.join(", ")}</span>
      <div
        className="animate-marquee flex w-max"
        style={{ ["--marquee-duration" as string]: `${duration}s`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        {row}
        {row}
      </div>
    </div>
  );
}
