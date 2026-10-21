/**
 * ─────────────────────────────────────────────────────────────
 *  BOMBITA — GLOBAL SITE CONFIGURATION
 *  Edit this file to change brand copy, ticket links, hero media
 *  and contact details. No component contains these values directly.
 * ─────────────────────────────────────────────────────────────
 */

/** Table / VIP reservations go to Bombita's WhatsApp. */
const tableUrl = process.env.NEXT_PUBLIC_TABLE_URL ?? "https://wa.me/message/FBGQHK7QC46PN1";

export const site = {
  name: "BOMBITA",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://bombita.nyc",
  title: "BOMBITA | NYC Latin Nightlife, Events & Music",
  description:
    "BOMBITA brings Latin music, DJs, live artists, nightlife and unforgettable experiences to New York City.",
  locale: "en_US",

  /**
   * Primary conversion. Used by every "GET TICKETS" button unless an
   * event defines its own `ticketUrl` in data/events.ts or the CMS.
   */
  ticketUrl:
    process.env.NEXT_PUBLIC_TICKET_URL ??
    "https://www.boletosexpress.com/?search=Bombita+",

  /** Table / VIP reservations (WhatsApp). Events can override. */
  tableUrl,

  /** Brand phrases — change freely. */
  phrases: {
    eyebrow: "Music × People × Culture",
    heroTitle: "BOMBITA",
    heroSubtitle: "PARTY",
    tagline: "La fiesta se vive.",
    signature: "Uptown NYC, always.",
    heritage: "Quisqueya to Uptown",
    statementA: "More than a party.",
    statementB: "A movement.",
    wearLine: "Clothing × Lifestyle × Represent",
    pillars: ["Music", "People", "Culture", "Community"],
    heroLeft: "Good music, better people",
    heroRight: "More than a party",
    home: "Bombita Party is home.",
    city: "New York City",
    genres: ["Latin music", "Culture", "Nightlife"],
  },

  /**
   * Hero media — client footage (Bombita Party recap), encoded from the
   * original 1080×1920 master into /public/videos:
   *   hero-720.mp4 / hero-1080.mp4 — 15s vertical highlight loop (no audio)
   *   hero-bg.mp4                  — blurred landscape backdrop for desktop
   * To swap: re-encode a new loop with the same names (see README).
   */
  hero: {
    video: {
      src: "/videos/hero-720.mp4",
      hd: "/videos/hero-1080.mp4",
      backdrop: "/videos/hero-bg.mp4",
      poster: "/images/bombita/hero-poster.jpg",
    },
  },

  /** Full recap film (with sound) for "Watch the vibe" and the experience section. */
  reel: {
    preview: "/videos/hero-720.mp4",
    sources: {
      "720": "/videos/bombita-film-720.mp4",
      "1080": "/videos/bombita-film-1080.mp4",
    },
    poster: "/images/bombita/hero-poster.jpg",
    portrait: true,
  },

  contact: {
    email: "bombitaparty@gmail.com",
    eventsEmail: "bombitaparty@gmail.com",
    partnershipsEmail: "bombitaparty@gmail.com",
    city: "New York, NY",
  },

  /** Primary navigation. `children` render as desktop dropdowns. */
  nav: [
    {
      label: "Events",
      href: "/events",
      children: [
        { label: "Upcoming events", href: "/events#upcoming" },
        { label: "Past events", href: "/events#past" },
        { label: "Calendar", href: "/events#calendar" },
        { label: "Birthday reservations", href: "/birthdays" },
        { label: "VIP tables", href: tableUrl },
        { label: "RSVP", href: "/events#upcoming" },
      ],
    },
    {
      label: "Photos",
      href: "/photos",
      children: [
        { label: "All galleries", href: "/photos" },
        { label: "Live artists", href: "/photos?category=Live%20Artists" },
        { label: "Day parties", href: "/photos?category=Day%20Parties" },
        { label: "Brunch", href: "/photos?category=Brunch" },
        { label: "Special events", href: "/photos?category=Special%20Events" },
      ],
    },
    { label: "Videos", href: "/videos" },
    {
      label: "Store",
      href: "/wear",
      children: [
        { label: "Bombita Wear", href: "/wear" },
        { label: "New arrivals", href: "/wear?category=New" },
        { label: "Hats", href: "/wear?category=Headwear" },
        { label: "Shirts", href: "/wear?category=Tops" },
        { label: "Accessories", href: "/wear?category=Accessories" },
      ],
    },
    {
      label: "About",
      href: "/about",
      children: [
        { label: "Our story", href: "/about#story" },
        { label: "Press", href: "/contact?subject=press" },
        { label: "Work with us", href: "/contact?subject=partnership" },
      ],
    },
    { label: "Contact", href: "/contact" },
  ],

  /** Mobile menu cards (ref: image-backed tiles). */
  menuCards: [
    { label: "Events", sub: "Upcoming parties", href: "/events", image: "/images/bombita/still-5.jpg" },
    { label: "Birthdays", sub: "Celebrate with us", href: "/birthdays", image: "/images/bombita/reel-8.jpg" },
    { label: "Bombita Wear", sub: "Merch & apparel", href: "/wear", image: "https://images.unsplash.com/photo-1737666636073-f15d9762cf83?w=1200&q=80&auto=format&fit=crop" },
    { label: "Photos", sub: "The vibes", href: "/photos", image: "/images/bombita/still-1.jpg" },
    { label: "Videos", sub: "Relive the moments", href: "/videos", image: "/images/bombita/still-6.jpg" },
    { label: "About", sub: "Our story", href: "/about", image: "https://images.unsplash.com/photo-1770929685906-1d5ecc1ab1f2?w=1200&q=80&auto=format&fit=crop" },
    { label: "Contact", sub: "Let's work", href: "/contact", image: "https://images.unsplash.com/photo-1767661667474-4f2a197c9a51?w=1200&q=80&auto=format&fit=crop" },
  ],
} as const;

export type Site = typeof site;
