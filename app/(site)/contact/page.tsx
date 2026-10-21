import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowUpRight, CalendarHeart, Handshake, Mail } from "lucide-react";
import { site } from "@/data/site";
import { socials } from "@/data/social";
import { PageHero } from "@/components/ui/PageHero";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { ContactForm } from "@/components/contact/ContactForm";
import { Reveal } from "@/components/animations/Reveal";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Bombita — general inquiries, event bookings, tables and partnerships in New York City.",
  alternates: { canonical: "/contact" },
};

const inquiries = [
  { icon: Mail, title: "General inquiries", text: "Questions, press and everything else.", email: site.contact.email, subject: "general" },
  { icon: CalendarHeart, title: "Event inquiries", text: "Birthdays, private events, tables and bookings.", email: site.contact.eventsEmail, subject: "event" },
  { icon: Handshake, title: "Partnerships", text: "Brands, venues and collaborations.", email: site.contact.partnershipsEmail, subject: "partnership" },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's"
        accent="talk."
        intro="Tables, private events, partnerships or just saying hola — we'd love to hear from you."
        image="https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=2200&q=75&auto=format&fit=crop"
      />

      <section aria-label="Inquiry types" className="container-lux py-16 md:py-24">
        <Reveal stagger={0.08} className="grid gap-px bg-white/10 md:grid-cols-3">
          {inquiries.map(({ icon: Icon, title, text, email, subject }) => (
            <div key={title} className="group relative bg-ink-950 p-8 transition-colors duration-500 hover:bg-ink-700 md:p-10">
              <Icon className="h-7 w-7 text-gold-400" strokeWidth={1.3} aria-hidden />
              <h2 className="mt-8 font-display text-4xl tracking-wide">{title}</h2>
              <p className="mt-3 text-sm text-mute">{text}</p>
              <div className="mt-8 flex flex-col gap-3">
                <a href={`mailto:${email}`} className="link-lux self-start text-sm text-white hover:text-gold-300">
                  {email}
                </a>
                <a
                  href={`?subject=${subject}#message`}
                  className="inline-flex items-center gap-2 self-start text-[0.65rem] font-bold uppercase tracking-[0.24em] text-gold-300"
                >
                  Use the form <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      <section id="message" aria-labelledby="form-title" className="container-lux grid scroll-mt-28 gap-14 pb-24 md:pb-36 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionLabel>Send a message</SectionLabel>
          <h2 id="form-title" className="mt-6 font-display text-6xl leading-[0.88] tracking-wide md:text-7xl">
            Write to <span className="text-gold-vertical">Bombita</span>
          </h2>
          <div className="mt-10 space-y-6 border-t border-white/10 pt-8">
            <div>
              <p className="eyebrow text-[0.6rem] text-mute-2">Based in</p>
              <p className="mt-1 text-white">{site.contact.city}</p>
            </div>
            <div>
              <p className="eyebrow text-[0.6rem] text-mute-2">Follow</p>
              <ul className="mt-3 flex gap-2">
                {socials.map((s) => (
                  <li key={s.network}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Bombita on ${s.label}`}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:border-gold-400 hover:text-gold-300"
                    >
                      <SocialIcon network={s.network} className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <Suspense>
            <ContactForm />
          </Suspense>
        </div>
      </section>
    </>
  );
}
