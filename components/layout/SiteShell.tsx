import type { ReactNode } from "react";
import { Providers } from "@/components/animations/Providers";
import { Preloader } from "@/components/preloader/Preloader";
import { Navbar } from "@/components/navbar/Navbar";
import { Footer } from "@/components/footer/Footer";
import { Cursor } from "@/components/cursor/Cursor";
import { BottomNav } from "@/components/navbar/BottomNav";

/** Public-site chrome: smooth scroll, transitions, preloader, nav, footer, cursor, grain. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-ink-950"
      >
        Skip to content
      </a>
      <Providers>
        <Preloader />
        <Navbar />
        <main id="main">{children}</main>
        <Footer />
        <BottomNav />
      </Providers>
      <Cursor />
      <div className="grain" aria-hidden />
    </>
  );
}
