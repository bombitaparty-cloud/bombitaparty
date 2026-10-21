import { site } from "@/data/site";
import { socials } from "@/data/social";
import { TLink } from "@/components/ui/TLink";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { JoinForm } from "./JoinForm";

const footerNav = [
  { label: "Events", href: "/events" },
  { label: "Birthdays", href: "/birthdays" },
  { label: "Photos", href: "/photos" },
  { label: "Videos", href: "/videos" },
  { label: "Bombita Wear", href: "/wear" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/** Slim premium footer (ref): logo · join the list · socials · heritage line. */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t border-gold-500/20 bg-ink-950">
      <div className="container-lux grid items-center gap-10 py-12 md:py-14 lg:grid-cols-[auto_1fr_auto_auto] lg:gap-14">
        <TLink href="/" aria-label="Bombita — home" className="justify-self-center lg:justify-self-start">
          <Logo className="scale-110" />
        </TLink>

        <div id="join-footer" className="flex w-full flex-col items-center gap-4 sm:flex-row sm:gap-6 lg:justify-center">
          <p className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.35em] text-white">Join the list</p>
          <div className="w-full max-w-md border border-white/20 px-4 transition-colors focus-within:border-gold-300">
            <JoinForm compact />
          </div>
        </div>

        <ul className="flex items-center justify-center gap-6">
          {socials.map((s) => (
            <li key={s.network}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Bombita on ${s.label}`}
                className="block text-white transition-colors hover:text-gold-300"
              >
                <SocialIcon network={s.network} className="h-5 w-5" />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-center gap-4 text-[0.6rem] font-bold uppercase leading-[1.9] tracking-[0.35em] text-white/80">
          <p>
            Quisqueya
            <br />
            to Uptown
          </p>
          <span className="h-px w-8 bg-gold-400" aria-hidden />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-lux flex flex-col items-center justify-between gap-6 py-8 lg:flex-row">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3">
              {footerNav.map((n) => (
                <li key={n.href}>
                  <TLink href={n.href} className="link-lux text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-white/75 hover:text-white">
                    {n.label}
                  </TLink>
                </li>
              ))}
            </ul>
          </nav>
          <p className="flex flex-wrap items-center justify-center gap-3 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white/60">
            Music <span className="text-red-500">•</span> Culture <span className="text-red-500">•</span> Good people <span className="text-red-500">•</span> NYC
          </p>
          <Button href={site.ticketUrl} size="sm">
            Get Tickets
          </Button>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-lux flex flex-col gap-2 py-5 text-center text-[0.58rem] font-semibold uppercase tracking-[0.3em] text-mute-2 md:flex-row md:justify-between">
          <p>© {year} Bombita · New York City</p>
          <a href={`mailto:${site.contact.email}`} className="normal-case tracking-[0.15em] hover:text-white">
            {site.contact.email}
          </a>
        </div>
      </div>
    </footer>
  );
}
