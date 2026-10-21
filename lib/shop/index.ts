import "server-only";
import { cache } from "react";
import { placeholderProducts } from "@/data/products";
import { isShopifyEnabled, shopifyProducts } from "./shopify";
import type { Product } from "./types";

/**
 * Commerce entry point. Uses the Shopify Storefront API when configured,
 * otherwise falls back to the placeholder catalog in data/products.ts.
 */
export const getProducts = cache(async (): Promise<Product[]> => {
  if (isShopifyEnabled) {
    try {
      return await shopifyProducts();
    } catch (err) {
      console.error("[shop] Shopify fetch failed, using placeholders", err);
    }
  }
  return placeholderProducts;
});

export async function getProduct(handle: string): Promise<Product | undefined> {
  return (await getProducts()).find((p) => p.handle === handle);
}
