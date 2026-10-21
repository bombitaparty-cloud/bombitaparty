"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { Product } from "@/lib/shop/types";
import { cn, formatPrice } from "@/lib/utils";
import { useLenis } from "@/components/animations/Providers";
import { Button } from "@/components/ui/Button";
import { SizePicker } from "./SizePicker";

const ease = [0.16, 1, 0.3, 1] as const;

export function QuickView({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const lenis = useLenis();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [picked, setPicked] = useState<{ id?: string; i: number }>({ i: 0 });
  const img = picked.id === product?.id ? picked.i : 0;
  const setImg = (i: number) => setPicked({ id: product?.id, i });

  useEffect(() => {
    if (!product) return;
    const l = lenis.current;
    l?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      l?.start();
    };
  }, [product, onClose, lenis]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-[125] flex items-end justify-center bg-ink-950/80 backdrop-blur-md md:items-center md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${product.name} — quick view`}
            className="relative grid max-h-[92svh] w-full max-w-5xl overflow-y-auto border border-gold-500/25 bg-ink-800 md:grid-cols-2"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.7, ease }}
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
          >
            <div className="relative aspect-[4/5] bg-ink-700 md:aspect-auto md:min-h-[560px]">
              <Image
                key={product.images[img]?.src}
                src={product.images[img]?.src ?? product.images[0].src}
                alt={product.images[img]?.alt ?? product.name}
                fill
                sizes="(min-width: 768px) 40vw, 100vw"
                quality={75}
                className="object-cover"
              />
              {product.images.length > 1 && (
                <div className="absolute bottom-4 left-4 flex gap-2">
                  {product.images.map((im, i) => (
                    <button
                      key={im.src}
                      type="button"
                      onClick={() => setImg(i)}
                      aria-label={`Show image ${i + 1}`}
                      aria-pressed={img === i}
                      className={cn(
                        "relative h-14 w-11 overflow-hidden border transition-colors",
                        img === i ? "border-gold-300" : "border-white/20 hover:border-white/60",
                      )}
                    >
                      <Image src={im.src} alt="" fill sizes="44px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col p-6 md:p-10">
              <p className="eyebrow text-gold-400">Bombita Wear · {product.category}</p>
              <h2 className="mt-4 font-display text-5xl leading-[0.9] tracking-wide">{product.name}</h2>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-gold-300">
                {formatPrice(product.price, product.currency)}
              </p>
              <p className="mt-6 text-sm leading-relaxed text-mute">{product.description}</p>

              {product.colors.length > 0 && (
                <div className="mt-6">
                  <p className="eyebrow text-[0.6rem] text-mute-2">Colors</p>
                  <p className="mt-2 text-sm text-white">{product.colors.join(" / ")}</p>
                </div>
              )}
              <SizePicker sizes={product.sizes} className="mt-6" />

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button href={product.url ?? `/wear/${product.handle}`} className="flex-1" magnetic={false} onClick={onClose}>
                  Shop now
                </Button>
              </div>
              {product.isPlaceholder && (
                <p className="mt-5 border-l border-gold-500/40 pl-3 text-[0.7rem] leading-relaxed text-mute-2">
                  Sample product for the store preview — final pricing, photography and checkout arrive with the launch.
                </p>
              )}
            </div>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close quick view"
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-ink-950/70 text-white backdrop-blur transition-colors hover:text-gold-300"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
