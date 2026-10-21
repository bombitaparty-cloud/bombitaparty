import "server-only";
import type { Product, ProductCategory } from "./types";

/**
 * Shopify Storefront API adapter.
 * Set in .env.local:
 *   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
 *   SHOPIFY_STOREFRONT_TOKEN=xxxxxxxx   (Storefront API public access token)
 */

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = "2025-07";

export const isShopifyEnabled = Boolean(domain && token);

async function storefront<T>(query: string, variables = {}): Promise<T> {
  const res = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token!,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300, tags: ["shopify"] },
  });
  if (!res.ok) throw new Error(`Shopify ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data as T;
}

interface ShopifyNode {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  onlineStoreUrl: string | null;
  availableForSale: boolean;
  tags: string[];
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  images: { nodes: { url: string; altText: string | null }[] };
  options: { name: string; values: string[] }[];
}

const CATEGORIES: ProductCategory[] = ["Tops", "Outerwear", "Headwear", "Accessories"];

export async function shopifyProducts(): Promise<Product[]> {
  const data = await storefront<{ products: { nodes: ShopifyNode[] } }>(`
    query Products {
      products(first: 50, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id handle title description productType onlineStoreUrl availableForSale tags
          priceRange { minVariantPrice { amount currencyCode } }
          images(first: 4) { nodes { url altText } }
          options { name values }
        }
      }
    }`);

  return data.products.nodes.map((p) => ({
    id: p.id,
    handle: p.handle,
    name: p.title,
    category: (CATEGORIES.find((c) => c === p.productType) ?? "Tops") as ProductCategory,
    price: Number(p.priceRange.minVariantPrice.amount),
    currency: p.priceRange.minVariantPrice.currencyCode,
    description: p.description,
    details: p.tags,
    images: p.images.nodes.map((i) => ({ src: i.url, alt: i.altText ?? p.title })),
    colors: p.options.find((o) => /colou?r/i.test(o.name))?.values ?? [],
    sizes: p.options.find((o) => /size/i.test(o.name))?.values ?? [],
    url: p.onlineStoreUrl ?? undefined,
    available: p.availableForSale,
  }));
}
