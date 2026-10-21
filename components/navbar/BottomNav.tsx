"use client";

import { usePathname } from "next/navigation";
import { Camera, CalendarDays, Home, Shirt, Ticket } from "lucide-react";
import { site } from "@/data/site";
import { cn } from "@/lib/utils";
import { TLink } from "@/components/ui/TLink";

const items = [
  { label: "Home", href: "/", icon: Home },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Photos", href: "/photos", icon: Camera },
  { label: "Wear", href: "/wear", icon: Shirt },
];

/**
 * App-style bottom bar for phones: the main destinations plus a raised
 * GET TICKETS button in the thumb zone. Hidden on desktop and on event
 * pages (they have their own sticky ticket bar).
 */
export function BottomNav() {
  const pathname = usePathname();
  if (/^\/events\/.+/.test(pathname)) return null;
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const [left, right] = [items.slice(0, 2), items.slice(2)];

  const tab = (it: (typeof items)[number]) => {
    const Icon = it.icon;
    const on = active(it.href);
    return (
      <TLink
        key={it.href}
        href={it.href}
        aria-current={on ? "page" : undefined}
        className={cn(
          "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.58rem] font-bold uppercase tracking-[0.14em] transition-colors",
          on ? "text-gold-300" : "text-white/65 active:text-white",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={on ? 2 : 1.6} aria-hidden />
        {it.label}
      </TLink>
    );
  };

  return (
    <>
      {/* spacer so the footer isn't hidden behind the bar */}
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] lg:hidden" />
      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-[95] border-t border-gold-500/25 bg-ink-950/[0.97] pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-end px-2">
          {left.map(tab)}
          <a
            href={site.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get tickets (opens in a new tab)"
            className="flex flex-1 flex-col items-center gap-1 pb-1.5"
          >
            <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 shadow-[0_8px_30px_-6px_rgba(224,185,79,.8)] ring-4 ring-ink-950 transition-transform active:scale-95">
              <Ticket className="h-6 w-6" strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-gold-300">Tickets</span>
          </a>
          {right.map(tab)}
        </div>
      </nav>
    </>
  );
}
