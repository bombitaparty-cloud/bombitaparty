import { Button } from "@/components/ui/Button";
import { Lockup } from "@/components/ui/Logo";
import { SiteShell } from "@/components/layout/SiteShell";

export default function NotFound() {
  return (
    <SiteShell>
    <section className="container-lux flex min-h-[90svh] flex-col items-center justify-center pt-[var(--nav-h)] text-center">
      <Lockup className="w-48" />
      <p className="eyebrow mt-8 text-gold-400">Error 404</p>
      <h1 className="mt-4 font-display text-[clamp(4rem,14vw,11rem)] leading-[0.85] tracking-wide">
        Wrong <span className="text-gold-vertical">party.</span>
      </h1>
      <p className="mt-4 font-serif text-2xl italic text-white/80">This page left before the last song.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button href="/">Back home</Button>
        <Button href="/events" variant="light">
          Upcoming events
        </Button>
      </div>
    </section>
    </SiteShell>
  );
}
