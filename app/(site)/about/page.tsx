import type { Metadata } from "next";
import { site } from "@/data/site";
import { bombita, cityImages } from "@/data/media";
import { LazyLoop } from "@/components/video/VideoWall";
import { PageHero } from "@/components/ui/PageHero";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { LineDraw, Parallax, Reveal, SplitReveal } from "@/components/animations/Reveal";

export const metadata: Metadata = {
  title: "About",
  description: "Bombita is a New York nightlife and entertainment brand — Latin music, DJs, live artists and Bombita Wear. Quisqueya to Uptown.",
  alternates: { canonical: "/about" },
};

const pillars = [
  { title: "Music", text: "Bachata, merengue, salsa, reggaetón, dembow — the sound of the city, played by the DJs and live artists who move it." },
  { title: "People", text: "A crowd that shows up dressed, ready and together. Bombita is la familia, every single night." },
  { title: "Culture", text: "Rooted Uptown, proud of where we come from, and built for all of New York to feel at home." },
  { title: "Community", text: "Parties, partnerships and Bombita Wear — everything we make gives back to the scene that made us." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Bombita"
        title="More than"
        accent="a party."
        intro={`${site.phrases.heritage}. A New York nightlife brand built on Latin music, people and culture.`}
        image={cityImages.street}
      />

      <section id="story" aria-labelledby="story-title" className="container-lux scroll-mt-24 grid gap-14 py-20 md:py-32 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionLabel index="01">Our story</SectionLabel>
          <SplitReveal as="h2" className="mt-6 font-display text-6xl leading-[0.88] tracking-wide md:text-8xl">
            <span id="story-title">Born in Uptown. Built for the love of dancing.</span>
          </SplitReveal>
          <p className="mt-6 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold-300">Bombita Party</p>
        </div>
        <Reveal className="space-y-6 text-lg leading-relaxed text-white/80 lg:col-span-6 lg:col-start-7">
          <p>
            Bombita Party started with humble hall parties at Club Tamboril in New York City and a hall on 207th Street
            in Uptown Manhattan.
          </p>
          <p>
            We weren&apos;t trying to create another nightlife brand. We simply wanted a place where we could dance, enjoy
            ourselves, and celebrate the music we loved.
          </p>
          <p>As nightlife changed and dance floors became less about dancing, we knew something was missing.</p>
          <p>
            After taking a break, we brought Bombita back for one reason: to revive the kind of nightlife we fell in love
            with. Real dancing, real connections, Bachata, Merengue, Típico, and nights you never wanted to end.
          </p>
          <p className="text-xl font-bold text-white md:text-2xl">
            We didn&apos;t bring back another party. We brought back the dance floor.
          </p>
          <p className="font-serif text-2xl italic text-gold-300 md:text-3xl">Uptown born. Dominican roots. Made for the love of music.</p>
        </Reveal>
      </section>

      <Parallax className="h-[70svh] md:h-[90vh]" speed={12}>
        <LazyLoop src={bombita.venueLoop.src} poster={bombita.venueLoop.poster} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/10 to-ink-950/30" />
        <p className="absolute bottom-8 left-0 right-0 container-lux text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-white/90 md:bottom-12 md:text-sm">
          Our Uptown home · <span className="text-gold-300">Radio Hotel</span>
        </p>
      </Parallax>

      <section aria-labelledby="pillars-title" className="container-lux py-20 md:py-32">
        <SectionLabel index="02">What we stand for</SectionLabel>
        <h2 id="pillars-title" className="mt-6 font-display text-6xl tracking-wide md:text-8xl">
          Music × People × Culture
        </h2>
        <Reveal stagger={0.1} className="mt-14 grid gap-px bg-white/10 md:grid-cols-2 xl:grid-cols-4">
          {pillars.map((p, i) => (
            <article key={p.title} className="group bg-ink-950 p-8 transition-colors duration-500 hover:bg-ink-700 md:p-10">
              <p className="font-display text-6xl text-gold-vertical">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-8 font-display text-4xl tracking-wide transition-colors group-hover:text-gold-300">{p.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-mute">{p.text}</p>
            </article>
          ))}
        </Reveal>
      </section>


      <section className="container-lux py-24 text-center md:py-36">
        <LineDraw origin="center" className="mb-16" />
        <p className="font-brush text-[clamp(3rem,10vw,8rem)] leading-none text-gold-gradient">{site.phrases.signature}</p>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Button href={site.ticketUrl} size="lg">
            Get Tickets
          </Button>
          <Button href="/contact" variant="light" size="lg">
            Work with us
          </Button>
        </div>
      </section>
    </>
  );
}
