import type { Album, Artist, Photo, Video } from "@/lib/cms/types";

/**
 * Photos, albums, videos and artists. Replace the demo URLs with your own
 * (put files in /public/images and use "/images/your-file.jpg"),
 * or manage them from Sanity once it's connected.
 *
 * Source images are requested at 2400px — Next/Image then serves each
 * screen only the size it needs (WebP), so phones never download the full file.
 */

export const u = (id: string, w = 2400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

/** Real Bombita Party footage & stills (client recap film, /public). */
export const bombita = {
  stills: {
    stageBanner: "/images/bombita/still-1.jpg",
    singerGreen: "/images/bombita/still-2.jpg",
    guitarist: "/images/bombita/still-3.jpg",
    singerShades: "/images/bombita/still-4.jpg",
    crowdLights: "/images/bombita/still-5.jpg",
    singerBraids: "/images/bombita/still-6.jpg",
    entrance: "/images/bombita/still-7.jpg",
    crowdDrinks: "/images/bombita/still-8.jpg",
  },
  /** Full clips with sound (720×1280), opened from the reels and the Videos page. */
  clips: {
    tipico: { src: "/videos/clip-tipico-live.mp4", poster: "/images/bombita/clip-tipico-live.jpg", title: "Típico en vivo", duration: "0:26" },
    enVivo: { src: "/videos/clip-en-vivo.mp4", poster: "/images/bombita/clip-en-vivo.jpg", title: "Bombita en vivo", duration: "1:04" },
    danceFloor: { src: "/videos/clip-dance-floor.mp4", poster: "/images/bombita/clip-dance-floor.jpg", title: "The dance floor", duration: "0:18" },
    radioHotel: { src: "/videos/clip-radio-hotel.mp4", poster: "/images/bombita/clip-radio-hotel.jpg", title: "Welcome to the Radio Hotel", duration: "0:35" },
    hauntedHotel: { src: "/videos/haunted-hotel-promo.mp4", poster: "/images/bombita/haunted-hotel-promo.jpg", title: "The Haunted Hotel", duration: "0:49" },
  },
  /** Short vertical loops (540×960, no audio) + poster frames. `clip` = full video opened on tap. */
  reels: [
    { src: "/videos/reel-8.mp4", poster: "/images/bombita/reel-8.jpg", label: "Típico en vivo", clip: "tipico" },
    { src: "/videos/reel-9.mp4", poster: "/images/bombita/reel-9.jpg", label: "Acordeón", clip: "enVivo" },
    { src: "/videos/reel-1.mp4", poster: "/images/bombita/reel-1.jpg", label: "La familia" },
    { src: "/videos/reel-10.mp4", poster: "/images/bombita/reel-10.jpg", label: "The dance floor", clip: "danceFloor" },
    { src: "/videos/reel-2.mp4", poster: "/images/bombita/reel-2.jpg", label: "En vivo" },
    { src: "/videos/reel-12.mp4", poster: "/images/bombita/reel-12.jpg", label: "Live band", clip: "enVivo" },
    { src: "/videos/reel-4.mp4", poster: "/images/bombita/reel-4.jpg", label: "On stage" },
    { src: "/videos/reel-5.mp4", poster: "/images/bombita/reel-5.jpg", label: "Uptown courtyard" },
    { src: "/videos/reel-6.mp4", poster: "/images/bombita/reel-6.jpg", label: "Headliners" },
    { src: "/videos/reel-7.mp4", poster: "/images/bombita/reel-7.jpg", label: "Phones up" },
  ] as { src: string; poster: string; label: string; clip?: "tipico" | "enVivo" | "danceFloor" | "radioHotel" | "hauntedHotel" }[],
  /** Radio Hotel walk-in loop (About page). */
  venueLoop: { src: "/videos/reel-11.mp4", poster: "/images/bombita/reel-11.jpg" },
  film: {
    sources: { "720": "/videos/bombita-film-720.mp4", "1080": "/videos/bombita-film-1080.mp4" },
    poster: "/images/bombita/hero-poster.jpg",
  },
};

/** Shared imagery (demo stock — replace as real photos arrive). */
export const img = {
  sparklersCrowd: u("1708449530105-ea7d453a6f89"),
  sparklersBottles: u("1708449530051-6b3ffb524f8f"),
  clubLasers: u("1788768010332-ca2951efd1ab"),
  bwDancers: u("1777029078123-399c118ec938"),
  djRed: u("1767661667474-4f2a197c9a51"),
  dancerArms: u("1762237786929-6e1bd26c4f5c"),
  crowdSmiles: u("1762237874410-17ddf6c782a1"),
  bachataCouple: u("1767784097087-8c1588215083"),
  paradeFlag: u("1778860540786-00f47326851c"),
  drFlag: u("1780777424838-3ec34be67737"),
  friendsClose: u("1764510376439-3a3a7ec17236"),
  mimosas: u("1778104959382-51bcfd8df80d"),
  brunchToast: u("1631776867527-3bb2ba0a0ad7"),
  gwbBridge: u("1770929685698-80a2a03cf673"),
  gwbSkyline: u("1770929685906-1d5ecc1ab1f2"),
  gwbDusk: u("1770929685497-a8edfaf831c1"),
  capGraphic: u("1604532057336-2c4a09f71330"),
  capModel: u("1568246621541-5704b4f0bbf2"),
  capBack: u("1525740615880-50bb88fe0b1f"),
  capWindow: u("1737666636073-f15d9762cf83"),
  rooftopNight: u("1695128751971-b3b050b5e13e"),
  neonClub: u("1696798559340-ad395e783816"),
  dancersStage: u("1545959570-a94084071b5d"),
  terraceLights: u("1761078739814-245f6e2943a6"),
  patioNight: u("1759866614069-e5b93d17e663"),
  sunglassesDancer: u("1775037231648-51b6f25f84df"),
  bwFriends: u("1786041063355-b61c3cadba83"),
  patioLanterns: u("1761455952969-8ec513b486c0"),
  confetti: u("1492684223066-81342ee5ff30"),
  pinkClub: u("1566737236500-c8ac43014a67"),
  goldStage: u("1459749411175-04bf5292ceea"),
  heartHands: u("1429962714451-bb934ecdc4ec"),
  liveGuitar: u("1598387993441-a364f854c3e1"),
  cheers: u("1541532713592-79a0317b6b77"),
  barWarm: u("1514933651103-005eec06c04b"),
  djBooth: u("1516873240891-4bf014598ab4"),
  djConsole: u("1470225620780-dba8ba36b745"),
  timesSquare: u("1538970272646-f61fabb3a8a2"),
  timesStreet: u("1534270804882-6b5048b1c1fc"),
  manhattan: u("1587162146766-e06b1189b907"),
};

export const photos: Photo[] = [
  { id: "b1", src: "/images/bombita/still-1.jpg", alt: "Live band under the Bombita Party banner", shape: "square", album: "Live Artists" },
  { id: "b2", src: "/images/bombita/still-5.jpg", alt: "Crowd under the lights at Bombita Party", shape: "square", album: "Bombita Nights" },
  { id: "b3", src: "/images/bombita/still-3.jpg", alt: "Guitarist performing live", shape: "square", album: "Live Artists" },
  { id: "b4", src: "/images/bombita/still-7.jpg", alt: "Guests arriving at Bombita Party", shape: "square", album: "Bombita Nights" },
  { id: "p1", src: img.sparklersCrowd, alt: "Bottle sparklers raised over the crowd", shape: "landscape", album: "Bottle Service" },
  { id: "p2", src: img.dancerArms, alt: "Dancer with arms raised in the club", shape: "portrait", album: "Bombita Nights" },
  { id: "p3", src: img.drFlag, alt: "Dominican flag in the sun", shape: "square", album: "Dominican Parade" },
  { id: "p4", src: img.bachataCouple, alt: "Couple dancing bachata", shape: "tall", album: "Live Artists" },
  { id: "p5", src: img.sparklersBottles, alt: "Sparkler bottles held high", shape: "landscape", album: "Bottle Service" },
  { id: "p6", src: img.friendsClose, alt: "Friends out for the night", shape: "portrait", album: "Bombita Nights" },
  { id: "p7", src: img.mimosas, alt: "Mimosas at brunch", shape: "square", album: "Brunch" },
  { id: "p8", src: img.djRed, alt: "DJ in the booth under red neon", shape: "portrait", album: "Bombita Nights" },
  { id: "p9", src: img.crowdSmiles, alt: "Smiling crowd on the dance floor", shape: "landscape", album: "Bombita Nights" },
  { id: "p10", src: img.bwDancers, alt: "Black and white dance floor moment", shape: "tall", album: "Throwback" },
  { id: "p11", src: img.paradeFlag, alt: "Celebrating with the Dominican flag", shape: "square", album: "Dominican Parade" },
  { id: "p12", src: img.patioNight, alt: "Patio lit with string lights", shape: "landscape", album: "Day Parties" },
  { id: "p13", src: img.sunglassesDancer, alt: "Dancing in sunglasses", shape: "portrait", album: "Day Parties" },
  { id: "p14", src: img.neonClub, alt: "Neon club signs", shape: "square", album: "Bombita Nights" },
  { id: "p15", src: img.brunchToast, alt: "Brunch toast on the terrace", shape: "landscape", album: "Brunch" },
  { id: "p16", src: img.liveGuitar, alt: "Live performer on stage", shape: "portrait", album: "Live Artists" },
];

/**
 * Event recap albums for /photos. ⚠ DEMO — titles come from the client
 * reference mockup; photos are stand-ins until real recaps are uploaded.
 */
export const albums: Album[] = [
  { slug: "el-rubio-acordeon-recap", title: "El Rubio Acordeón", date: "2026-09-12", venue: "Radio Hotel", category: "Live Artists", cover: "/images/bombita/still-1.jpg", photos: ["/images/bombita/still-1.jpg", "/images/bombita/still-3.jpg", "/images/bombita/still-5.jpg", "/images/bombita/still-7.jpg", img.liveGuitar, img.sparklersCrowd, img.crowdSmiles, img.bachataCouple, img.dancerArms] },
  { slug: "raulin-rodriguez-recap", title: "Raulín Rodríguez", date: "2026-09-06", venue: "Radio Hotel", category: "Live Artists", cover: "/images/bombita/still-2.jpg", photos: ["/images/bombita/still-2.jpg", "/images/bombita/still-4.jpg", img.sparklersBottles, img.friendsClose, img.goldStage, img.heartHands] },
  { slug: "teodoro-reyes-recap", title: "Teodoro Reyes", date: "2026-08-08", venue: "Radio Hotel", category: "Day Parties", cover: img.patioNight, photos: [img.patioNight, img.terraceLights, img.sunglassesDancer, img.crowdSmiles] },
  { slug: "dominican-parade-after-party", title: "Dominican Parade After Party", date: "2026-08-09", venue: "Radio Hotel", category: "Special Events", cover: img.paradeFlag, photos: [img.paradeFlag, img.drFlag, img.confetti, img.sparklersCrowd] },
  { slug: "luis-vargas-recap", title: "Luis Vargas", date: "2026-06-27", venue: "Radio Hotel", category: "Live Artists", cover: img.drFlag, photos: [img.drFlag, img.bachataCouple, img.crowdSmiles] },
  { slug: "patio-season-kickoff", title: "Patio Season Kickoff", date: "2026-05-02", venue: "Radio Hotel", category: "Day Parties", cover: img.sparklersCrowd, photos: [img.sparklersCrowd, img.patioLanterns, img.rooftopNight, img.cheers] },
  { slug: "the-legends", title: "The Legends", date: "2026-07-11", venue: "Radio Hotel", category: "Throwback", cover: img.friendsClose, photos: [img.friendsClose, img.bwDancers, img.bwFriends, img.djRed] },
  { slug: "el-patio-brunch", title: "El Patio Brunch", date: "2026-05-17", venue: "Radio Hotel", category: "Brunch", cover: img.mimosas, photos: [img.mimosas, img.brunchToast, img.cheers] },
  { slug: "geovanny-polanco-recap", title: "Geovanny Polanco", date: "2026-07-18", venue: "Radio Hotel", category: "Live Artists", cover: "/images/bombita/still-6.jpg", photos: ["/images/bombita/still-6.jpg", "/images/bombita/still-8.jpg", img.djRed, img.dancerArms, img.clubLasers, img.neonClub] },
  { slug: "bombita-nights-vol-12", title: "Bombita Nights Vol. 12", date: "2026-04-18", venue: "Marquee New York", category: "Special Events", cover: img.clubLasers, photos: [img.clubLasers, img.pinkClub, img.djBooth, img.dancerArms] },
  { slug: "throwback-thursday", title: "Throwback Night", date: "2026-03-28", venue: "Radio Hotel", category: "Throwback", cover: img.bwDancers, photos: [img.bwDancers, img.bwFriends, img.heartHands] },
  { slug: "rooftop-sunset-session", title: "Rooftop Sunset Session", date: "2026-06-06", venue: "Radio Hotel", category: "Day Parties", cover: img.rooftopNight, photos: [img.rooftopNight, img.terraceLights, img.patioLanterns] },
];

export const albumCategories = ["Live Artists", "Day Parties", "Brunch", "Throwback", "Special Events"] as const;

export const videos: Video[] = [
  { id: "film", title: "Bombita Party", subtitle: "The recap film", sources: bombita.film.sources, preview: "/videos/hero-720.mp4", poster: bombita.film.poster, duration: "1:21", featured: true, portrait: true },
  { id: "tipico", title: "Típico en Vivo", subtitle: "Live accordion on stage", sources: { "720": bombita.clips.tipico.src }, preview: "/videos/reel-8.mp4", poster: bombita.clips.tipico.poster, duration: bombita.clips.tipico.duration, portrait: true },
  { id: "en-vivo", title: "Bombita en Vivo", subtitle: "The full performance", sources: { "720": bombita.clips.enVivo.src }, preview: "/videos/reel-9.mp4", poster: bombita.clips.enVivo.poster, duration: bombita.clips.enVivo.duration, portrait: true },
  { id: "haunted-hotel", title: "The Haunted Hotel", subtitle: "Halloween Night 2026 · Oct 31", sources: { "720": bombita.clips.hauntedHotel.src }, poster: bombita.clips.hauntedHotel.poster, duration: bombita.clips.hauntedHotel.duration, portrait: true },
  { id: "dance-floor", title: "The Dance Floor", subtitle: "Bombita at night", sources: { "720": bombita.clips.danceFloor.src }, preview: "/videos/reel-10.mp4", poster: bombita.clips.danceFloor.poster, duration: bombita.clips.danceFloor.duration, portrait: true },
  { id: "radio-hotel", title: "Welcome to the Radio Hotel", subtitle: "Our Uptown home", sources: { "720": bombita.clips.radioHotel.src }, preview: "/videos/reel-11.mp4", poster: bombita.clips.radioHotel.poster, duration: bombita.clips.radioHotel.duration, portrait: true },
];

/** ⚠ Demo roster — replace with the real residents & guests. */
export const artists: Artist[] = [
  { slug: "dj-bombita", name: "DJ Bombita", role: "Resident DJ", image: { src: u("1493676304819-0d7a8d026dcf", 1600), alt: "DJ performing" } },
  { slug: "dj-uptown", name: "DJ Uptown", role: "Resident DJ", image: { src: img.djRed, alt: "DJ in the booth" } },
  { slug: "live-band", name: "La Banda", role: "Live Artists", image: { src: img.liveGuitar, alt: "Live musician" } },
  { slug: "special-guests", name: "Special Guests", role: "Every Season", image: { src: u("1493225457124-a3eb161ffa5f", 1600), alt: "Performer with smoke" } },
];

/** City imagery used by NYC / brand sections. */
export const cityImages = {
  skyline: img.gwbSkyline,
  bridge: img.gwbBridge,
  dusk: img.gwbDusk,
  street: img.timesStreet,
  aerial: img.timesSquare,
  manhattan: img.manhattan,
};

/** Look up a reel by its number (reel-8 → 8). */
export const reel = (n: number) => bombita.reels.find((r) => r.src === `/videos/reel-${n}.mp4`) ?? bombita.reels[0];
