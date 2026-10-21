/**
 * ─────────────────────────────────────────────────────────────
 *  BOMBITA WEAR — PLACEHOLDER CATALOG
 *
 *  ⚠ This is demo data, clearly separated from production.
 *  Prices are intentionally `null` (shown as "Price TBA") because no
 *  real pricing was provided. Photos are stand-ins until the product
 *  shoot is delivered.
 *
 *  Production: set SHOPIFY_STORE_DOMAIN + SHOPIFY_STOREFRONT_TOKEN and
 *  lib/shop will pull live products from the Shopify Storefront API.
 * ─────────────────────────────────────────────────────────────
 */
import type { Product } from "@/lib/shop/types";

const u = (id: string, w = 2400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`;

export const placeholderProducts: Product[] = [
  {
    id: "demo-cap",
    handle: "bombita-dad-cap",
    name: "Bombita Dad Cap",
    category: "Headwear",
    price: null,
    currency: "USD",
    description:
      "Unstructured six-panel cap with the embroidered Bombita mark on the front and the heritage line across the back strap.",
    details: ["Embroidered front logo", "Adjustable strap", "One size"],
    images: [
      { src: u("1737666636073-f15d9762cf83"), alt: "Black cap on a windowsill" },
      { src: u("1568246621541-5704b4f0bbf2"), alt: "Model wearing a black cap" },
    ],
    colors: ["Black", "Stone", "Royal"],
    sizes: ["One size"],
    badge: "Signature",
    isPlaceholder: true,
  },
  {
    id: "demo-hoodie",
    handle: "bombita-heavyweight-hoodie",
    name: "Heavyweight Hoodie",
    category: "Tops",
    price: null,
    currency: "USD",
    description:
      "Heavyweight fleece hoodie with a tonal chest hit and an oversized Bombita back print. Built for 4AM sidewalks.",
    details: ["Heavyweight brushed fleece", "Oversized fit", "Back print"],
    images: [
      { src: u("1525740615880-50bb88fe0b1f"), alt: "Hoodie and cap from the back" },
      { src: u("1556821840-3a63f95609a7"), alt: "Hoodie shown from the back" },
    ],
    colors: ["Heather", "Black", "Rosa"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    badge: "New",
    isPlaceholder: true,
  },
  {
    id: "demo-tee",
    handle: "bombita-logo-tee",
    name: "Logo Tee",
    category: "Tops",
    price: null,
    currency: "USD",
    description:
      "Boxy fit heavyweight tee with the Bombita mark on the chest. The uniform.",
    details: ["Heavyweight cotton", "Boxy fit", "Screen-printed chest logo"],
    images: [
      { src: u("1618354691373-d851c5c3a990"), alt: "Black tee with small chest logo" },
      { src: u("1618517351616-38fb9c5210c6"), alt: "Model wearing a black tee" },
    ],
    colors: ["Black", "White"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    isPlaceholder: true,
  },
  {
    id: "demo-crew",
    handle: "quisqueya-crewneck",
    name: "Quisqueya Crewneck",
    category: "Tops",
    price: null,
    currency: "USD",
    description:
      "Midweight crewneck with gold embroidered chest mark. Quisqueya to Uptown.",
    details: ["Gold thread embroidery", "Ribbed cuffs & hem", "Regular fit"],
    images: [
      { src: u("1614975059251-992f11792b9f"), alt: "Navy crewneck with small gold logo" },
      { src: u("1578587018452-892bacefd3f2"), alt: "Crewneck worn by a model" },
    ],
    colors: ["Navy", "Black"],
    sizes: ["S", "M", "L", "XL"],
    badge: "Limited",
    isPlaceholder: true,
  },
  {
    id: "demo-jacket",
    handle: "uptown-utility-jacket",
    name: "Uptown Utility Jacket",
    category: "Outerwear",
    price: null,
    currency: "USD",
    description:
      "Washed utility jacket with an embroidered Bombita patch and gold-tone hardware.",
    details: ["Cotton twill", "Gold-tone snaps", "Embroidered patch"],
    images: [
      { src: u("1548883354-94bcfe321cbb"), alt: "Olive utility jacket" },
      { src: u("1551028719-00167b16eac5"), alt: "Jacket in black and white" },
    ],
    colors: ["Olive", "Black"],
    sizes: ["S", "M", "L", "XL"],
    isPlaceholder: true,
  },
  {
    id: "demo-graphic-tee",
    handle: "la-fiesta-se-vive-tee",
    name: "La Fiesta Se Vive Tee",
    category: "Tops",
    price: null,
    currency: "USD",
    description: "Graphic tee with the Bombita tagline printed across the back.",
    details: ["Heavyweight cotton", "Back graphic", "Relaxed fit"],
    images: [
      { src: u("1583743814966-8936f5b7be1a"), alt: "Black graphic tee" },
      { src: u("1503341504253-dff4815485f1"), alt: "Model wearing a graphic tee" },
    ],
    colors: ["Black"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    isPlaceholder: true,
  },
  {
    id: "demo-beanie",
    handle: "bombita-knit-beanie",
    name: "Knit Beanie",
    category: "Accessories",
    price: null,
    currency: "USD",
    description: "Rib-knit cuffed beanie with a woven Bombita label.",
    details: ["Rib knit", "Woven label", "One size"],
    images: [
      { src: u("1576871337632-b9aef4c17ab9"), alt: "Knit beanies" },
    ],
    colors: ["Black", "Rosa"],
    sizes: ["One size"],
    isPlaceholder: true,
  },
  {
    id: "demo-varsity",
    handle: "bombita-varsity-crew",
    name: "Varsity Crew Tee",
    category: "Tops",
    price: null,
    currency: "USD",
    description: "Collegiate-inspired Bombita graphic on a white heavyweight tee.",
    details: ["Heavyweight cotton", "Front graphic", "Regular fit"],
    images: [
      { src: u("1576566588028-4147f3842f27"), alt: "White tee with collegiate graphic" },
      { src: u("1521572163474-6864f9cf17ab"), alt: "Plain white tee" },
    ],
    colors: ["White"],
    sizes: ["S", "M", "L", "XL"],
    isPlaceholder: true,
  },
];

/** Editorial imagery for the Bombita Wear sections. */
export const wearEditorial = {
  hero: u("1523398002811-999ca8dec234"),
  secondary: u("1509631179647-0177331693ae", 1400),
  lookbook: [
    u("1552374196-1ab2a1c593e8", 1200),
    u("1529139574466-a303027c1d8b", 1200),
    u("1605289355680-75fb41239154", 1200),
  ],
};
