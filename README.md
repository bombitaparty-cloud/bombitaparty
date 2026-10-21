# BOMBITA — NYC Latin Nightlife

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · GSAP (ScrollTrigger + SplitText) · Motion · Lenis · Lucide

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

Copy `.env.example` to `.env.local` to override the defaults. Everything works without any env vars.

---

## 1. Project structure

```
app/
  page.tsx                  Homepage (hero → statement → party/wear → events → video → gallery → wear → NYC → social)
  events/page.tsx           Calendar: featured, upcoming list, past recaps
  events/[slug]/page.tsx    Event detail (static params, metadata, Event JSON-LD, sticky mobile ticket bar)
  photos/ videos/ wear/ wear/[handle]/ about/ contact/
  api/contact  api/subscribe  Form endpoints (validated server-side; plug in your email provider)
  sitemap.ts robots.ts opengraph-image.tsx icon.svg not-found.tsx
components/
  animations/   Providers (Lenis + intro state), PageTransition, Reveal/SplitReveal/Parallax/ImageReveal, Magnetic, ScrollX
  preloader/    Branded loader (plays once per session, always on a fresh homepage load)
  navbar/       Sticky nav + full-screen mobile menu
  hero/ events/ gallery/ video/ wear/ home/ contact/ footer/ cursor/ ui/
data/           ← ALL editable content lives here
  site.ts       Brand copy, ticket URL, hero video, contact emails, nav
  events.ts     Events (demo)
  products.ts   Bombita Wear placeholder catalog + editorial images
  media.ts      Photos, videos, artists, city imagery
  social.ts     Instagram / TikTok / YouTube
lib/
  cms/          getEvents()/getPhotos()… — local data or Sanity, chosen automatically
  shop/         getProducts() — placeholder data or Shopify Storefront API
  utils/        Date formatting (NYC time), validation, helpers
sanity/schemaTypes/   Ready-made Sanity schemas (event, photo, video)
public/images  public/videos  public/logos   Your own media
```

Components never import content directly from scattered constants — pages fetch through `lib/cms` and `lib/shop`, so switching to a CMS or Shopify needs no component changes.

## 2. Add a new event

**Easiest:** use the admin dashboard at `/admin` (section 11). The steps below edit the starting data in code.

Open `data/events.ts`, copy an existing object and edit it:

```ts
{
  slug: "bombita-new-years-eve",            // URL → /events/bombita-new-years-eve
  title: "Bombita New Year's Eve",
  subtitle: "2027 Countdown",
  startsAt: "2026-12-31T22:00:00-05:00",   // NYC offset: -04:00 in summer, -05:00 in winter
  endsAt:   "2027-01-01T04:00:00-05:00",
  venue: { name: "Marquee New York", address: "289 10th Ave", city: "New York, NY" },
  artists: ["Artist TBA"], djs: ["DJ Bombita"],
  description: "…",
  flyer: { src: "/images/nye-flyer.jpg", alt: "NYE flyer" },   // put the file in public/images
  gallery: [],
  status: "on-sale",       // on-sale | few-left | sold-out | coming-soon | past
  featured: true,          // leads the homepage
  ticketUrl: "",           // optional — empty uses the site default
}
```

Past events move to "Past nights" automatically once their end time passes (pages re-render hourly). To remove an event, delete its object.

## 3. Change the ticket URL

Default for every **GET TICKETS** button: `data/site.ts → ticketUrl` (currently `https://www.boletosexpress.com/?search=Bombita+`).
You can also set `NEXT_PUBLIC_TICKET_URL` in `.env.local` or in Vercel's environment variables — no code change needed.
Per event: set `ticketUrl` (and `tableUrl`) on that event; it overrides the default.

## 4. Replace the hero video

1. Export a short loop (8–15 s, muted, H.264 MP4, 1080p or 720p, ideally < 6 MB) plus a poster JPG.
2. Put them in `public/videos/hero.mp4` and `public/images/hero-poster.jpg`.
3. In `data/site.ts`:
   ```ts
   hero: { video: { src: "/videos/hero.mp4", srcMobile: "/videos/hero-mobile.mp4", poster: "/images/hero-poster.jpg" } }
   ```
   `srcMobile` can be a lighter or vertical cut for phones. The homepage reel ("Feel the energy") is `site.reel`.

## 5. Update Bombita Wear products

Edit `data/products.ts`. Each product has `name`, `category`, `price` (`null` shows "Price TBA"), `images`, `colors`, `sizes`, `details`, optional `badge` and `url` (external checkout link).
Products marked `isPlaceholder: true` show a "sample product" note — remove it for real items.
**Shopify:** set `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_TOKEN`; `lib/shop` will pull live products (title, price, images, color/size options, online-store URL) and the placeholders are ignored.

## 6. Change social links

`data/social.ts` — update `url`, `handle` and `socialHandle`. The navbar, mobile menu, footer, contact page and "Follow the movement" section all update.

## 7. Connect Sanity CMS

1. Create a Studio: `npm create sanity@latest` (in a separate folder or `/studio`).
2. Copy `sanity/schemaTypes/*` into the Studio and register them: `schema: { types: schemaTypes }`.
3. Deploy the Studio (`npx sanity deploy`) — the client edits events, flyers, galleries, videos there.
4. In this project set:
   ```
   NEXT_PUBLIC_SANITY_PROJECT_ID=xxxx
   NEXT_PUBLIC_SANITY_DATASET=production
   SANITY_READ_TOKEN=            # only if the dataset is private
   ```
   `lib/cms` detects the project ID and switches every query to Sanity (GROQ over HTTP, no SDK). Content refreshes every 60 s; for instant updates add a Sanity webhook that calls a route running `revalidateTag("sanity", "max")`.

## 8. Deploy to Vercel

1. Push the repo to GitHub/GitLab.
2. vercel.com → **Add New Project** → import the repo (framework auto-detected: Next.js).
3. Add environment variables (at minimum `NEXT_PUBLIC_SITE_URL=https://your-domain`).
4. Deploy, then add the custom domain under **Settings → Domains**.
5. After each deploy, warm the image cache so the first visitors get fast images:
   `node scripts/warm-cache.mjs https://your-domain` (takes about a minute).

## 9. Navigation, galleries, RSVP & media quality

- **Dropdown menus / mobile menu cards:** `data/site.ts → nav` (items with `children` become dropdowns) and `menuCards` (label, subtitle, image for each mobile-menu tile).
- **Event gallery albums:** `data/media.ts → albums` (title, date, venue, category, cover, photos). Categories drive the filter chips; `/photos?category=Brunch` deep-links a chip.
- **RSVP / guest list:** every upcoming event page has an RSVP form → `app/api/rsvp` (connect your door list where marked `TODO(production)`).
- **Store deep links:** `/wear?category=Headwear` (or `Tops`, `Accessories`, `New`) preselects the filter.
- **4K images:** image URLs request up to 3840px sources; Next/Image serves each device only the size it needs (AVIF/WebP), so 4K screens get 4K and phones stay light.
- **4K video:** each clip lists renditions `{ "720", "1080", "2160" }`. Background loops play 720p (1080p on large, fast screens) — a 4K background loop is 50–150 MB and would stall the page. The fullscreen player auto-selects up to **4K** on large screens with fast connections and has a quality switch. For your own footage, export 720p / 1080p / 4K MP4s (or use Mux / Cloudflare Stream for adaptive streaming) and list them the same way.

## 10. Official logo & client footage

**Logo files** (`public/logos`, cut from the client's transparent master):

| File | Use |
| --- | --- |
| `bombita-lockup.png` | Full logo (mascot + BOMBITA + PARTY) — nav, footer, menu, signup |
| `bombita-logo.png` | Mascot + BOMBITA, no PARTY line — pair with your own sub-line (Party / Wear) |
| `bombita-mark.png` + `bombita-wordmark.png` | The two halves the hero animates separately (only use them stacked) |
| `bombita-logo-dark.jpg` | Logo on the dark crowd background (social / press) |

Favicons (`app/icon.png`, `app/apple-icon.png`) and the share image (`app/opengraph-image.jpg`) are generated from the same artwork.

**Footage** (`public/videos`, encoded from the client's 1080×1920 recap `C1827_1.mp4`):

| File | What it is |
| --- | --- |
| `hero-720.mp4` / `hero-1080.mp4` | 15s vertical highlight loop, no audio (hero, reel cards) |
| `hero-bg.mp4` | Blurred landscape version for the desktop hero backdrop |
| `reel-1…7.mp4` | 5s vertical clips for the "This is Bombita" wall and tiles |
| `bombita-film-720.mp4` / `-1080.mp4` | Full 1:21 film with sound (fullscreen player) |

Stills in `public/images/bombita` are frames cropped above the burned-in watermark.

To rebuild from a new master (`new.mp4`), with ffmpeg:

```bash
# 15s highlight loop from five 3s moments (edit the timestamps)
ffmpeg -i new.mp4 -filter_complex "[0:v]trim=4:7,setpts=PTS-STARTPTS[a];[0:v]trim=30:33,setpts=PTS-STARTPTS[b];[0:v]trim=36:39,setpts=PTS-STARTPTS[c];[0:v]trim=52:55,setpts=PTS-STARTPTS[d];[0:v]trim=64:67,setpts=PTS-STARTPTS[e];[a][b][c][d][e]concat=n=5:v=1:a=0[v]" -map "[v]" -an -crf 18 loop.mp4
ffmpeg -i loop.mp4 -vf scale=720:1280 -an -c:v libx264 -crf 25 -pix_fmt yuv420p -movflags +faststart public/videos/hero-720.mp4
ffmpeg -i loop.mp4 -vf scale=1080:1920 -an -c:v libx264 -crf 24 -pix_fmt yuv420p -movflags +faststart public/videos/hero-1080.mp4
ffmpeg -i loop.mp4 -vf "scale=1280:-2,crop=1280:720,boxblur=24:4" -an -c:v libx264 -crf 30 -pix_fmt yuv420p -movflags +faststart public/videos/hero-bg.mp4
# full film with sound
ffmpeg -i new.mp4 -vf scale=1080:1920 -c:v libx264 -crf 23 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart public/videos/bombita-film-1080.mp4
```

The videos folder is ~80 MB. That deploys fine on Vercel, but for a growing library move footage to a video host (Mux, Cloudflare Stream or Vercel Blob) and put the URLs in `data/site.ts` / `data/media.ts`.

## 11. Admin dashboard (manage events without code)

Go to **`/admin`** (e.g. `https://your-site.com/admin`) and sign in with the admin password.

What the client can do:

- **Create an event** — name, subtitle, tagline, date & start/end time (New York time; an end time earlier than the start means "next day"), venue, line-up, description, flyer upload, gallery photos, video, ticket & table links, ticket status, age, dress code.
- **Schedule** — *Publish now*, *Schedule* (hidden until a chosen date & time), or *Save as draft*.
- **Feature** an event (★) — it becomes the "Next" event in the homepage hero. Only one at a time.
- **Edit, duplicate, publish/unpublish, delete** from the list. Tabs show Live & upcoming, Scheduled, Drafts and Past.
- Past events move to "Past" automatically when they end.

Every save refreshes the public pages immediately (homepage, /events, the event page, sitemap).

### Set up on Vercel (one time)

1. **Storage:** Vercel → your project → **Storage** → *Create* → **Blob** → connect it to the project. This adds `BLOB_READ_WRITE_TOKEN` automatically. Event data and uploaded flyers are stored there (each save keeps a version; the last 20 are kept).
2. **Password:** Vercel → Settings → **Environment Variables** → add `ADMIN_PASSWORD` (Production). Optionally add `ADMIN_SECRET` (any long random string) to sign sessions separately.
3. **Redeploy** (`npx vercel --prod`).

Until a Blob store is connected, the live dashboard shows the events from `data/events.ts` read-only and explains that saving is disabled. The first save copies those events into storage, after which the dashboard is the source of truth.

**Local development:** put `ADMIN_PASSWORD=…` in `.env.local`. Events save to `.data/events.json` and uploads to `public/uploads` (both git-ignored).

How it works: `lib/store/events.ts` (storage), `lib/admin/auth.ts` (signed session cookie), `app/admin/actions.ts` (save / delete / duplicate / feature / publish), `app/api/admin/upload` (direct-to-Blob uploads), `app/admin/*` (UI).

## 12. Gallery email gate & subscriber list

- **/photos is email-gated.** Visitors see a blurred preview and enter an email (no password, no verification) to unlock it. A cookie remembers them for a year. The real photos are only sent to visitors who have joined.
- **Every email is collected in one list:** gallery unlocks, the "Be the first to know" signup (name + city), the footer box and event RSVPs. Signing up anywhere also unlocks the gallery.
- **Admin → Subscribers** (`/admin/subscribers`): live counts (auto-refresh every 20s), search, filter by source, and **Download Excel** — a `.xlsx` with one row per email plus a sheet of every individual signup.
- Storage: each signup is its own private object in the Vercel Blob store (written as public with an unguessable path if the store doesn't allow private objects); locally `.data/subscribers.json`.
- Code: `lib/store/subscribers.ts`, `lib/member.ts`, `components/gallery/GalleryGate.tsx`, `app/api/subscribe`, `app/admin/(panel)/subscribers`, `app/api/admin/subscribers/export`.

> Tip: if your local `.env` contains the production `BLOB_STORE_ID` / `BLOB_READ_WRITE_TOKEN`, local signups and admin saves go to the **live** store. Remove them to test against local files.

---

### Before launch — replace demo content

- **Logo:** official client artwork is installed (see section 10). Drop the official logo (SVG) in `public/logos` and swap it in.
- **Photography & video:** the hero, reel wall and experience section use the client's recap film; remaining photos are Unsplash and some clips Mixkit (free-license stock). Replace them with Bombita's own shoots (`data/media.ts`, `data/products.ts`, `data/site.ts`).
- **Events:** line-ups come from the reference mockup; dates/venues are placeholders to confirm.
- **Copy:** the About page story and the artist roster in `data/media.ts` are draft copy.
- **Emails & handles:** `info@bombita.nyc`, `@bombita` are placeholders.
- **Forms:** `app/api/contact` and `app/api/subscribe` validate and log — connect Resend/Mailchimp/Klaviyo where marked `TODO(production)`.

## 13. Birthday reservations

`/birthdays` ("Celebrate your birthday") collects birthday, VIP table and
group-night requests: name, phone, email, celebration type, date, group size
and notes. Requests appear in **Admin → Reservations** (upcoming nights first,
with an Excel download), and each email is also added to Subscribers as
"Birthday / VIP request". After sending, guests get a button to continue on
WhatsApp (`NEXT_PUBLIC_TABLE_URL`, the same link as "Reserve a Table").
Celebration types are listed in `lib/utils/validation.ts` → `CELEBRATION_TYPES`.

## 14. Media library & date-wise gallery (Neon PostgreSQL)

The `/photos` gallery and **Admin → Media** run on a PostgreSQL (Neon) media
library: every photo/video, its date, checksum, status and renditions are
database records; optimized WebP renditions are served from Vercel Blob.
Full guide — setup, migrations, importing date-wise folders, API reference,
backups, tests and measurements — in **[docs/MEDIA.md](docs/MEDIA.md)**.

```bash
npm run db:migrate                                  # apply migrations (needs DATABASE_URL)
npm run media:import -- "media-import/<folder>"     # import a date-wise folder as drafts
npm run media:verify                                # re-check every stored rendition
```
