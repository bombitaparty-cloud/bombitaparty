import Image from "next/image";
import { CalendarDays, Crown, Flame, Gem, Megaphone, Ticket } from "lucide-react";
import { site } from "@/data/site";
import { img } from "@/data/media";
import { BrushUnderline, Lockup } from "@/components/ui/Logo";
import { Reveal, SplitReveal } from "@/components/animations/Reveal";
import { SignupForm } from "./SignupForm";

const perks = [
  { icon: CalendarDays, label: "Upcoming events" },
  { icon: Ticket, label: "Ticket releases" },
  { icon: Megaphone, label: "Special announcements" },
  { icon: Gem, label: "Exclusive invites" },
  { icon: Flame, label: "Giveaways & more" },
];

function DRFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-label="Dominican Republic flag" role="img">
      <rect width="30" height="20" fill="#fff" />
      <rect width="13" height="8" fill="#002d62" />
      <rect x="17" width="13" height="8" fill="#ce1126" />
      <rect y="12" width="13" height="8" fill="#ce1126" />
      <rect x="17" y="12" width="13" height="8" fill="#002d62" />
      <circle cx="15" cy="10" r="1.6" fill="#0a7a3a" />
    </svg>
  );
}

/** "Stay connected — Be the first to know" signup (ref). */
export function JoinSection() {
  return (
    <section id="join" aria-labelledby="join-title" className="relative isolate scroll-mt-20 overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 -z-10">
        <Image src={img.sparklersBottles} alt="" fill sizes="100vw" quality={75} className="object-cover opacity-45" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_45%,rgba(5,5,5,.92),rgba(5,5,5,.55))]" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-transparent to-ink-950" />
      </div>

      <div className="container-lux flex flex-col items-center text-center">
        <div className="flex items-end gap-2">
          <Lockup className="w-44 md:w-56" />
        </div>

        <p className="mt-8 pl-[0.5em] text-sm font-semibold uppercase tracking-[0.5em] text-white/85 md:text-base">Stay connected</p>
        <SplitReveal as="h2" className="mt-2 font-display text-[clamp(3.5rem,11vw,8.5rem)] uppercase leading-[0.85] tracking-wide">
          <span id="join-title">Be the first</span>
        </SplitReveal>
        <div className="relative -mt-1">
          <p className="brush-dry -rotate-3 font-brush text-[clamp(3.25rem,10vw,7.5rem)] leading-none text-gold-gradient">TO KNOW</p>
          <BrushUnderline color="#e0b94f" className="absolute -bottom-2 left-[5%] block h-4 w-[90%] md:h-6" />
        </div>
        <p className="mt-8 max-w-2xl pl-[0.3em] text-[0.7rem] font-semibold uppercase leading-loose tracking-[0.3em] text-white/85 md:text-sm">
          Events. Artists. Ticket drops.
          <br />
          Exclusive updates. Special invites.
        </p>

        <Reveal className="mt-10 w-full max-w-xl border border-gold-400/60 bg-ink-950/75 p-5 text-left shadow-[0_0_80px_-30px_rgba(224,185,79,.5)] backdrop-blur-md md:p-8">
          <SignupForm />
        </Reveal>

        <Reveal as="ul" stagger={0.07} className="mt-12 grid w-full max-w-4xl grid-cols-3 gap-y-8 border-b border-white/10 pb-10 md:grid-cols-5">
          {perks.map(({ icon: Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-3">
              <Icon className="h-8 w-8 text-gold-400" strokeWidth={1.2} aria-hidden />
              <span className="max-w-[10ch] text-[0.62rem] font-semibold uppercase leading-snug tracking-[0.18em] text-white/85">{label}</span>
            </li>
          ))}
        </Reveal>

        <div className="mt-12 flex flex-col items-center">
          <Crown className="h-8 w-8 text-gold-400" strokeWidth={1.3} aria-hidden />
          <p className="brush-dry mt-1 -rotate-6 font-brush text-5xl leading-none text-white md:text-6xl">{site.phrases.home}</p>
          <BrushUnderline color="#ffffff" className="mt-2 h-3 w-48 opacity-80" />
        </div>

        <p className="mt-10 flex flex-wrap items-center justify-center gap-4 text-[0.62rem] font-semibold uppercase tracking-[0.4em] text-white/75">
          <span>New York City</span>
          <span className="h-3 w-px bg-white/30" aria-hidden />
          <span>{site.phrases.heritage}</span>
          <span className="h-3 w-px bg-white/30" aria-hidden />
          <DRFlag className="h-4 w-6" />
        </p>
      </div>
    </section>
  );
}
