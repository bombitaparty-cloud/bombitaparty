"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { site } from "@/data/site";
import { socials } from "@/data/social";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn, isExternal } from "@/lib/utils";
import { useIntro } from "@/components/animations/Providers";
import { TLink } from "@/components/ui/TLink";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { MobileMenu } from "./MobileMenu";

export interface NavLink {
  label: string;
  href: string;
}
export interface NavItem extends NavLink {
  children?: readonly NavLink[];
}
const nav = site.nav as readonly NavItem[];

const linkCls = (active: boolean) =>
  cn(
    "link-lux text-[0.6875rem] font-semibold uppercase tracking-[0.24em] transition-colors duration-300",
    active ? "text-gold-300" : "text-white/80 hover:text-white",
  );

/** Desktop dropdown: opens on hover, focus or chevron click; Esc closes. */
function Dropdown({ item, active }: { item: NavItem; active: boolean }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const show = () => {
    window.clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    timer.current = window.setTimeout(() => setOpen(false), 140);
  };

  return (
    <li
      data-nav-item
      className="relative [.js_&]:invisible"
      onPointerEnter={show}
      onPointerLeave={hide}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && hide()}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <div className="flex items-center gap-1.5">
        <TLink href={item.href} aria-current={active ? "page" : undefined} className={linkCls(active)}>
          {item.label}
        </TLink>
        <button
          type="button"
          aria-label={`${item.label} menu`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-6 w-4 items-center justify-center text-white/60 hover:text-gold-300"
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", open && "rotate-180 text-gold-300")} />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 10, clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
            exit={{ opacity: 0, y: 6, clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-[calc(100%+1.6rem)] min-w-56 border border-gold-500/25 bg-ink-950/95 py-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] backdrop-blur-xl"
          >
            <span aria-hidden className="absolute left-5 top-0 h-px w-8 bg-red-500" />
            {item.children!.map((c) => {
              const cls =
                "group/item flex items-center justify-between gap-6 px-5 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/80 transition-colors hover:bg-white/[0.04] hover:text-gold-300";
              return (
                <li key={c.label}>
                  {isExternal(c.href) ? (
                    <a href={c.href} target="_blank" rel="noopener noreferrer" className={cls}>
                      {c.label}
                    </a>
                  ) : (
                    <TLink href={c.href} className={cls} onClick={() => setOpen(false)}>
                      {c.label}
                      <span aria-hidden className="-translate-x-1 text-gold-400 opacity-0 transition-all duration-300 group-hover/item:translate-x-0 group-hover/item:opacity-100">
                        →
                      </span>
                    </TLink>
                  )}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
      {/* Hover bridge so the pointer can travel from the label to the panel */}
      {open && <span aria-hidden className="absolute inset-x-0 top-full h-7" />}
    </li>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { ready } = useIntro();
  const ref = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > 480 && y > last + 2);
      if (y < last - 2) setHidden(false);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu whenever the route changes.
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  useGSAP(
    () => {
      if (!ready) return;
      const items = ref.current!.querySelectorAll("[data-nav-item]");
      if (prefersReducedMotion()) {
        gsap.set(items, { autoAlpha: 1 });
        return;
      }
      gsap.fromTo(
        items,
        { y: -24, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.05, ease: "expo.out", delay: 0.55 },
      );
    },
    { dependencies: [ready], scope: ref },
  );

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header
        ref={ref}
        className={cn(
          "fixed inset-x-0 top-0 z-[100] transition-[transform,background-color,border-color,backdrop-filter] duration-700 ease-[var(--ease-expo)]",
          scrolled && !open
            ? "border-b border-gold-500/20 bg-ink-950/95 md:bg-ink-950/75 md:backdrop-blur-xl"
            : "border-b border-transparent bg-gradient-to-b from-ink-950/80 to-transparent",
          hidden && !open && "-translate-y-full",
        )}
      >
        <nav aria-label="Primary" className="container-lux flex items-center justify-between gap-6" style={{ height: "var(--nav-h)" }}>
          <TLink href="/" aria-label="Bombita — home" data-nav-item className={cn("[.js_&]:invisible", open && "max-lg:pointer-events-none")}>
            <span className={cn("block transition-opacity duration-300", open && "max-lg:opacity-0")}>
              <Logo />
            </span>
          </TLink>

          <ul className="hidden items-center gap-7 lg:flex xl:gap-9">
            <li data-nav-item className="[.js_&]:invisible">
              <TLink href="/" aria-current={pathname === "/" ? "page" : undefined} className={linkCls(pathname === "/")}>
                Home
              </TLink>
            </li>
            {nav.map((item) =>
              item.children ? (
                <Dropdown key={item.href} item={item} active={isActive(item.href)} />
              ) : (
                <li key={item.href} data-nav-item className="[.js_&]:invisible">
                  <TLink href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={linkCls(isActive(item.href))}>
                    {item.label}
                  </TLink>
                </li>
              ),
            )}
          </ul>

          <div className="flex items-center gap-5">
            <ul className="hidden items-center gap-4 xl:flex">
              {socials.map((s) => (
                <li key={s.network} data-nav-item className="[.js_&]:invisible">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Bombita on ${s.label}`}
                    className="block text-white/75 transition-colors duration-300 hover:text-gold-300"
                  >
                    <SocialIcon network={s.network} className="h-[17px] w-[17px]" />
                  </a>
                </li>
              ))}
            </ul>
            <div data-nav-item className={cn("hidden sm:block [.js_&]:invisible", open && "max-lg:hidden")}>
              <Button href={site.ticketUrl} variant="outline" size="sm" arrow={false}>
                Get Tickets
              </Button>
            </div>
            <button
              type="button"
              data-nav-item
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="relative z-[110] flex h-11 w-11 items-center justify-center lg:hidden [.js_&]:invisible"
            >
              <span className="relative block h-3 w-7">
                <span
                  className={cn(
                    "absolute left-0 top-0 h-px w-full bg-white transition-transform duration-500 ease-[var(--ease-expo)]",
                    open && "translate-y-1.5 rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "absolute bottom-0 right-0 h-px w-2/3 bg-white transition-all duration-500 ease-[var(--ease-expo)]",
                    open && "w-full -translate-y-1.5 -rotate-45",
                  )}
                />
              </span>
            </button>
          </div>
        </nav>
      </header>
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
