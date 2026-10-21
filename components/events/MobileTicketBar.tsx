"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Sticky bottom CTA on phones — appears once the hero buttons scroll away. */
export function MobileTicketBar({
  ticketUrl,
  label,
  meta,
  disabled,
}: {
  ticketUrl: string;
  label: string;
  meta: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[95] border-t border-gold-500/30 bg-ink-950/[0.97] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-transform duration-500 ease-[var(--ease-expo)] md:hidden",
        show ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center gap-4">
        <p className="min-w-0 flex-1 truncate text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-mute">{meta}</p>
        {disabled ? (
          <span className="flex h-12 items-center border border-white/20 px-6 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/60">
            {label}
          </span>
        ) : (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center bg-gradient-to-r from-gold-500 to-gold-300 px-7 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-ink-950"
          >
            {label}
          </a>
        )}
      </div>
    </div>
  );
}
