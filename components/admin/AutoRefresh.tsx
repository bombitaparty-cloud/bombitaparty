"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches the server-rendered page every `seconds` so counts stay live. */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  const [ago, setAgo] = useState(0);
  useEffect(() => {
    const tick = window.setInterval(() => setAgo((a) => a + 1), 1000);
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setAgo(0);
      }
    }, seconds * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(refresh);
    };
  }, [router, seconds]);
  return (
    <span className="inline-flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mute" aria-live="off">
      <span className="relative flex h-2 w-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      Live · updated {ago < 5 ? "just now" : `${ago}s ago`}
    </span>
  );
}
