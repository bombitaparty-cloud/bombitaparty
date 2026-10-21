"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Mail } from "lucide-react";
import { site } from "@/data/site";
import { socials } from "@/data/social";
import { img } from "@/data/media";
import { useLenis } from "@/components/animations/Providers";
import { TLink } from "@/components/ui/TLink";
import { Button } from "@/components/ui/Button";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { Lockup, BrushUnderline } from "@/components/ui/Logo";

const ease = [0.16, 1, 0.3, 1] as const;

/** Full-screen mobile menu: brand lockup + image-backed link cards. */
export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lenis = useLenis();

  useEffect(() => {
    const l = lenis.current;
    if (open) {
      l?.stop();
      document.body.style.overflow = "hidden";
    } else {
      l?.start();
      document.body.style.overflow = "";
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lenis, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-lenis-prevent
          className="fixed inset-0 z-[99] overflow-y-auto overscroll-contain bg-ink-950 lg:hidden"
          initial={{ clipPath: "circle(0% at calc(100% - 44px) 40px)" }}
          animate={{ clipPath: "circle(150% at calc(100% - 44px) 40px)" }}
          exit={{ clipPath: "circle(0% at calc(100% - 44px) 40px)" }}
          transition={{ duration: 0.9, ease }}
        >
          {/* backdrop */}
          <div aria-hidden className="pointer-events-none fixed inset-0">
            <Image src={img.sparklersCrowd} alt="" fill sizes="100vw" quality={60} className="object-cover opacity-30 blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/85 to-ink-950" />
          </div>

          <div className="relative flex min-h-full flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5">
            <span className="self-start border border-white/20 px-4 py-2 text-[0.6rem] font-bold uppercase tracking-[0.5em] text-white/80">
              NYC
            </span>

            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease, delay: 0.15 }}
              className="-mt-4"
            >
              <TLink href="/" onClick={onClose} aria-label="Bombita — home">
                <Lockup className="mx-auto w-56" priority />
              </TLink>
              <p className="mt-2 text-center text-[0.6rem] font-semibold uppercase tracking-[0.6em] text-gold-300">NYC</p>
            </motion.div>

            <nav aria-label="Mobile" className="mt-7">
              <ul className="space-y-3">
                {site.menuCards.map((c, i) => (
                  <motion.li
                    key={c.href}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease, delay: 0.25 + i * 0.06 }}
                  >
                    <TLink
                      href={c.href}
                      onClick={onClose}
                      className="group relative flex h-[4.75rem] items-center overflow-hidden border border-gold-500/50 bg-ink-900 px-5 transition-colors active:border-gold-300"
                    >
                      <span aria-hidden className="absolute inset-y-0 right-0 w-[62%]">
                        <Image src={c.image} alt="" fill sizes="60vw" quality={75} className="object-cover transition-transform duration-700 group-active:scale-105" />
                        <span className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/60 to-ink-900/10" />
                      </span>
                      <span className="relative flex-1">
                        <span className="block text-lg font-semibold uppercase tracking-[0.28em] text-white">{c.label}</span>
                        <span className="mt-0.5 block text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-gold-300">{c.sub}</span>
                      </span>
                      <ArrowRight className="relative h-5 w-5 text-gold-300 transition-transform group-active:translate-x-1" strokeWidth={1.5} />
                    </TLink>
                  </motion.li>
                ))}
              </ul>
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.7 }}
              className="mt-7 flex flex-col items-center gap-7 text-center"
            >
              <Button href={site.ticketUrl} size="lg" className="w-full" magnetic={false}>
                Get Tickets
              </Button>
              <ul className="flex items-center">
                {socials.map((s) => (
                  <li key={s.network} className="flex items-center">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="flex h-12 w-14 items-center justify-center text-gold-300 active:text-white"
                    >
                      <SocialIcon network={s.network} className="h-5 w-5" />
                    </a>
                    <span className="h-6 w-px bg-white/20" aria-hidden />
                  </li>
                ))}
                <li>
                  <a href={`mailto:${site.contact.email}`} aria-label="Email Bombita" className="flex h-12 w-14 items-center justify-center text-gold-300">
                    <Mail className="h-5 w-5" strokeWidth={1.5} />
                  </a>
                </li>
              </ul>
              <div>
                <p className="text-[0.7rem] font-bold uppercase leading-[2] tracking-[0.45em] text-gold-300">
                  {site.phrases.statementA.replace(".", "")}
                  <br />
                  {site.phrases.statementB.replace(".", "")}
                </p>
                <BrushUnderline className="mx-auto mt-2 h-2.5 w-16" />
              </div>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.5em] text-white/70">
                Bombita Party
                <br />
                <span className="text-white/40">New York City</span>
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
