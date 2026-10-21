import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // WebP encodes several times faster than AVIF, so first (uncached) loads stay quick.
    formats: ["image/webp"],
    // Few sizes and qualities → far more requests hit the image cache.
    deviceSizes: [640, 828, 1080, 1440, 1920],
    imageSizes: [96, 128, 256, 384],
    qualities: [60, 75],
    // Keep optimized images cached for 31 days (the default is only 4 hours).
    minimumCacheTTL: 2678400,
    remotePatterns: [
      // Demo photography (replace with your own assets in /public/images or the CMS)
      { protocol: "https", hostname: "images.unsplash.com" },
      // Sanity CMS image CDN
      { protocol: "https", hostname: "cdn.sanity.io" },
      // Admin uploads (Vercel Blob)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Shopify product images
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
