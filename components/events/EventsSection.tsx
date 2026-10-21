import type { BombitaEvent } from "@/lib/cms/types";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TLink } from "@/components/ui/TLink";
import { Reveal, SplitReveal } from "@/components/animations/Reveal";
import { EventRow } from "./EventRow";

export function EventsSection({ upcoming }: { upcoming: BombitaEvent[] }) {
  const rest = upcoming.slice(0, 6);

  return (
    <section id="events" aria-labelledby="events-title" className="relative py-24 md:py-36">
      <div className="container-lux">
        <div className="mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionLabel index="02">Next event</SectionLabel>
            <SplitReveal as="h2" className="mt-6 font-display text-[clamp(3rem,8vw,7rem)] leading-[0.88] tracking-wide">
              <span id="events-title">Upcoming Events</span>
            </SplitReveal>
            <p className="mt-3 font-serif text-xl italic text-gold-300 md:text-2xl">The next Bombita experience</p>
          </div>
          <TLink href="/events" className="link-lux eyebrow self-start text-white/80 hover:text-white md:self-end">
            View all events →
          </TLink>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="flex min-w-0 flex-col lg:col-span-8">
            <p className="eyebrow mb-5 flex items-center justify-between text-gold-400">
              <span>Upcoming</span>
              <span className="text-mute-2">{String(rest.length).padStart(2, "0")} dates</span>
            </p>
            <Reveal stagger={0.1} className="flex flex-col gap-3">
              {rest.map((e) => (
                <EventRow key={e.slug} event={e} />
              ))}
            </Reveal>
            {rest.length === 0 && (
              <p className="border border-white/10 p-8 text-mute">New dates drop soon — join the list to hear first.</p>
            )}
          </div>
          <div className="hidden min-w-0 lg:col-span-4 lg:block">
            <div className="sticky top-[calc(var(--nav-h)+2rem)]">
              <div className="border border-white/10 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(212,175,55,.12),transparent_60%)] p-8">
                <p className="eyebrow text-gold-400">Private events & tables</p>
                <p className="mt-3 font-display text-3xl leading-none tracking-wide">Birthdays. Bottles. Bombita.</p>
                <TLink href="/contact" className="link-lux mt-5 inline-block text-xs font-bold uppercase tracking-[0.24em] text-white">
                  Make an inquiry →
                </TLink>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
