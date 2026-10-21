import type { BombitaEvent, Venue } from "@/lib/cms/types";

/**
 * ─────────────────────────────────────────────────────────────
 *  EVENTS — local content source (seed for the admin dashboard)
 *
 *  Upcoming line-up from the Boletos Express listings. Every GET TICKETS
 *  button uses site.ticketUrl (the Bombita search on Boletos Express) unless
 *  an event sets its own `ticketUrl`. Flyers live in /public/images/events.
 *
 *  To add an event: copy one object below, give it a unique `slug`,
 *  and update the fields. Set `featured: true` on the event that should
 *  lead the homepage. Past events (status "past" or a date in the past)
 *  automatically move to the recaps list.
 *
 *  Once events are saved from /admin, the dashboard copy is used instead
 *  of this file. When Sanity is configured (see README), events come
 *  from the CMS.
 * ─────────────────────────────────────────────────────────────
 */

const u = (id: string, w = 2400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const radioHotel: Venue = {
  name: "Radio Hotel",
  address: "2420 Amsterdam Ave",
  city: "New York, NY",
  mapUrl: "https://maps.google.com/?q=Radio+Hotel+2420+Amsterdam+Ave+New+York",
};

const mofongo: Venue = {
  name: "La Casa del Mofongo de la 207",
  address: "546 W 207th St",
  city: "New York, NY 10034",
  mapUrl: "https://maps.google.com/?q=La+Casa+del+Mofongo+546+West+207th+Street+New+York+NY+10034",
};

const flyer = (file: string, alt: string) => ({ src: `/images/events/${file}.jpg`, alt });

/** Shared closing line for every night at the venue. */
const night =
  "Resident and guest DJs keep the floor moving all night, with Dominican kitchen favorites — mofongo included — and VIP bottle service available.";

export const events: BombitaEvent[] = [
  {
    slug: "elvis-martinez-la-cabra",
    title: "Elvis Martínez",
    subtitle: "“La Cabra” — En Vivo",
    tagline: "Bachata with full orchestra",
    startsAt: "2026-10-17T20:00:00-04:00",
    venue: mofongo,
    artists: ["Elvis Martínez"],
    djs: ["Guest DJs"],
    description: `One of bachata's most beloved voices takes the stage uptown with his full orchestra for a night of the hits everybody knows by heart. Guest DJs open from 8PM with dembow, merengue típico and salsa to warm up the room. ${night} Regular $60 · VIP by the bar $80.`,
    flyer: flyer("elvis-martinez", "Elvis Martínez “La Cabra” live at La Casa del Mofongo flyer"),
    gallery: [],
    status: "on-sale",
    featured: true,
    ageLimit: 21,
  },
  {
    slug: "teodoro-reyes",
    title: "Teodoro Reyes",
    subtitle: "En Vivo",
    tagline: "Damas gratis toda la noche",
    startsAt: "2026-10-23T20:00:00-04:00",
    venue: mofongo,
    artists: ["Teodoro Reyes"],
    djs: ["Resident DJs"],
    description: `A Friday with a living legend of bachata: the singer-songwriter behind decades of classics performs live. Ladies get in free all night. ${night} Regular $30.`,
    flyer: flyer("teodoro-reyes", "Teodoro Reyes live at La Casa del Mofongo flyer"),
    gallery: [],
    status: "on-sale",
    ageLimit: 21,
  },
  {
    slug: "el-rubio-acordeon-geovanny-polanco",
    title: "El Rubio Acordeón & Geovanny Polanco",
    subtitle: "En Vivo",
    tagline: "A night of merengue típico & accordion",
    startsAt: "2026-10-24T20:00:00-04:00",
    venue: mofongo,
    artists: ["El Rubio Acordeón", "Geovanny Polanco"],
    djs: ["Resident DJs"],
    description: `Two heavyweights of típico on one bill: El Rubio Acordeón and “El Mambólogo” Geovanny Polanco bring the accordion, güira and tambora for a non-stop merengue típico night. ${night} General $40 · VIP $60.`,
    flyer: flyer("el-rubio-geovanny-polanco", "El Rubio Acordeón and Geovanny Polanco live flyer"),
    gallery: [],
    status: "on-sale",
    ageLimit: 21,
  },
  {
    slug: "hector-acosta-el-torito",
    title: "Héctor Acosta",
    subtitle: "“El Torito” — En Vivo",
    tagline: "Halloween gala",
    startsAt: "2026-10-31T20:00:00-04:00",
    venue: mofongo,
    artists: ["Héctor Acosta “El Torito”"],
    djs: ["Resident DJs"],
    description: `Spend Halloween with El Torito. Héctor Acosta and his full band deliver a bachata and merengue gala packed with the anthems — costumes welcome. ${night} General $40 · VIP $60.`,
    flyer: flyer("hector-acosta", "Héctor Acosta “El Torito” Halloween gala flyer"),
    gallery: [],
    status: "on-sale",
    ageLimit: 21,
    dressCode: "Costumes welcome",
  },
  {
    slug: "the-haunted-hotel-halloween-2026",
    title: "The Haunted Hotel",
    subtitle: "Halloween Night 2026",
    tagline: "Bombita Party & La Vibra Bachatera",
    startsAt: "2026-10-31T17:00:00-04:00",
    endsAt: "2026-11-01T02:00:00-05:00",
    venue: { ...radioHotel, name: "Radio Hotel — The Fifth Floor", city: "New York, NY 10040" },
    artists: ["El Rubio Acordeón"],
    djs: ["DJ Jonez", "DJ Andre Rosé", "SoyJayJay"],
    description:
      "Bombita Party and La Vibra Bachatera take over the fifth floor of the Radio Hotel for Halloween. El Rubio Acordeón plays live, with DJ Jonez, DJ Andre Rosé and SoyJayJay on the decks from doors at 5PM until 2AM. Come in costume — the best costume of the night wins $1,000 cash. General admission tickets are released in tiers; the earlier you buy, the less you pay.",
    flyer: flyer("the-haunted-hotel", "The Haunted Hotel — Bombita Halloween Night 2026 flyer"),
    gallery: [],
    video: "/videos/haunted-hotel-promo.mp4",
    status: "few-left",
    ageLimit: 21,
    dressCode: "Costumes encouraged — $1,000 for the best costume",
  },
  {
    slug: "el-blachy",
    title: "El Blachy",
    subtitle: "En Vivo",
    tagline: "La voz romántica del merengue típico",
    startsAt: "2026-11-07T20:00:00-05:00",
    venue: mofongo,
    artists: ["El Blachy"],
    djs: ["Resident DJs"],
    description: `The romantic voice of merengue típico comes to 207th Street for a night of heartfelt típico you can dance to until close. ${night} General $25 · VIP $40.`,
    flyer: flyer("el-blachy", "El Blachy live at La Casa del Mofongo flyer"),
    gallery: [],
    status: "on-sale",
    ageLimit: 21,
  },
  {
    slug: "amenazzy-secreto",
    title: "Amenazzy & Secreto",
    subtitle: "En Vivo",
    tagline: "Latin trap & dembow night",
    startsAt: "2026-11-14T20:00:00-05:00",
    venue: mofongo,
    artists: ["Amenazzy", "Secreto “El Famoso Biberón”"],
    djs: ["Resident DJs"],
    description: `The urban side of the night: Amenazzy and Secreto bring their Latin trap and dembow hits live for a high-energy Saturday. ${night} General $50 · VIP $70.`,
    flyer: flyer("amenazzy-secreto", "Amenazzy and Secreto live flyer"),
    gallery: [],
    status: "on-sale",
    ageLimit: 21,
  },
  {
    slug: "joe-veras-wason-brasoban",
    title: "Joe Veras & Wason Brazobán",
    subtitle: "En Vivo",
    tagline: "El hombre de tu vida",
    startsAt: "2026-11-21T20:00:00-05:00",
    venue: mofongo,
    artists: ["Joe Veras", "Wason Brazobán"],
    djs: ["Resident DJs"],
    description: `A double bill of romantic bachata: Joe Veras, “el hombre de tu vida”, shares the night with Wason Brazobán for a set of love songs made for dancing close. ${night} General $40 · VIP $60.`,
    flyer: flyer("joe-veras-wason-brasoban", "Joe Veras and Wason Brazobán live flyer"),
    gallery: [],
    status: "on-sale",
    ageLimit: 21,
  },
  {
    slug: "cerrando-el-verano",
    title: "Cerrando el Verano",
    subtitle: "Bombita Party",
    tagline: "The summer finale",
    startsAt: "2026-09-12T15:00:00-04:00",
    endsAt: "2026-09-12T23:00:00-04:00",
    venue: radioHotel,
    artists: [],
    djs: ["DJ Bombita"],
    description: "The summer finale. Thank you, familia.",
    flyer: { src: u("1708449530105-ea7d453a6f89"), alt: "Bottle sparklers over the crowd" },
    gallery: [
      { src: u("1514525253161-7a46d19cd819"), alt: "Confetti cannons over a crowd" },
      { src: u("1459749411175-04bf5292ceea"), alt: "Golden stage lights" },
    ],
    status: "past",
  },
];
