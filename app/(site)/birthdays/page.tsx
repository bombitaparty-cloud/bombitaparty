import type { Metadata } from "next";
import { Cake, Crown, GlassWater, Sparkles } from "lucide-react";
import { reel } from "@/data/media";
import { PageHero } from "@/components/ui/PageHero";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/animations/Reveal";
import { LazyLoop } from "@/components/video/VideoWall";
import { BirthdayForm } from "@/components/birthday/BirthdayForm";

export const metadata: Metadata = {
  title: "Birthday Reservations",
  description: "Celebrate your birthday at Bombita Party — VIP tables, bottles, group nights and private celebrations in New York City.",
  alternates: { canonical: "/birthdays" },
};

const perks = [
  { icon: Crown, title: "VIP tables", text: "The best seats in the room for you and your crew." },
  { icon: GlassWater, title: "Bottle packages", text: "Bottles, sparklers and service all night." },
  { icon: Cake, title: "Birthday moments", text: "Cake, a shout-out from the DJ, the whole room singing." },
  { icon: Sparkles, title: "Group nights", text: "Squads, bachelorettes, anniversaries — we plan it with you." },
];

export default function BirthdaysPage() {
  return (
    <>
      <PageHero
        eyebrow="Birthday Reservations"
        title="Celebrate your"
        accent="birthday."
        intro="Bachata, merengue, típico and your people. Tell us about your night and we'll make it unforgettable."
        image={reel(8).poster}
      />

      {/* Phones: intro → form → perks. Desktop: copy + perks on the left, form on the right. */}
      <section aria-labelledby="bday-title" className="container-lux grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-x-16">
        <div className="lg:col-span-5">
          <SectionLabel>Tell us what you&apos;re celebrating</SectionLabel>
          <h2 id="bday-title" className="mt-6 font-display text-[clamp(3rem,8vw,5.5rem)] uppercase leading-[0.9] tracking-wide">
            Planning a birthday, <span className="text-gold-300">VIP table</span> or group night?
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-white/75">
            Tell us what you are celebrating and we will help match you with the right venue, event, table, or package.
          </p>
        </div>

        <div className="lg:col-span-7 lg:row-span-2">
          <BirthdayForm />
        </div>

        <div className="lg:col-span-5">
          <Reveal stagger={0.08} className="grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-2">
            {perks.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-ink-950 p-5">
                <Icon className="h-5 w-5 text-gold-400" aria-hidden />
                <h3 className="mt-3 font-display text-2xl tracking-wide">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-mute">{text}</p>
              </div>
            ))}
          </Reveal>

          <div className="relative mt-10 hidden aspect-[9/16] max-w-xs overflow-hidden border border-white/10 lg:block">
            <LazyLoop src={reel(10).src} poster={reel(10).poster} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
            <p className="absolute bottom-4 left-4 font-display text-3xl uppercase tracking-wide">Your night</p>
          </div>
        </div>
      </section>
    </>
  );
}
