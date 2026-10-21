import type { MediaImage } from "@/lib/cms/types";

export type ProductCategory = "Tops" | "Outerwear" | "Headwear" | "Accessories";

export interface Product {
  id: string;
  handle: string;
  name: string;
  category: ProductCategory;
  /** Price in major units (e.g. 45 = $45). `null` → "Price TBA". */
  price: number | null;
  currency: string;
  description: string;
  details: string[];
  images: MediaImage[];
  colors: string[];
  sizes: string[];
  badge?: string;
  /** External checkout / product URL (Shopify online store). */
  url?: string;
  available?: boolean;
  /** True for demo data. Shows the "sample product" notice in the UI. */
  isPlaceholder?: boolean;
}
