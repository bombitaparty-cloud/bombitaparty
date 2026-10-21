/**
 * Social links. Update handles/URLs here — the navbar, footer, mobile menu,
 * contact page and "Follow the movement" section all read from this list.
 */
export type SocialNetwork = "instagram" | "tiktok" | "youtube";

export interface SocialLink {
  network: SocialNetwork;
  label: string;
  handle: string;
  url: string;
  /** Short line shown in the editorial social section. */
  blurb: string;
  /** Image revealed on hover in the social section. */
  image: string;
}

export const socialHandle = "@bombitaparty";

export const socials: SocialLink[] = [
  {
    network: "instagram",
    label: "Instagram",
    handle: "@bombitaparty",
    url: "https://www.instagram.com/bombitaparty",
    blurb: "Flyers, recaps & the night in photos",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=75&auto=format&fit=crop",
  },
  {
    network: "tiktok",
    label: "TikTok",
    handle: "@bombitaparty",
    url: "https://www.tiktok.com/@bombitaparty",
    blurb: "The dance floor, uncut",
    image:
      "https://images.unsplash.com/photo-1485872299829-c673f5194813?w=900&q=75&auto=format&fit=crop",
  },
  {
    network: "youtube",
    label: "YouTube",
    handle: "@bombitaparty",
    url: "https://www.youtube.com/@bombitaparty",
    blurb: "Aftermovies, sets & live performances",
    image:
      "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=900&q=75&auto=format&fit=crop",
  },
];
