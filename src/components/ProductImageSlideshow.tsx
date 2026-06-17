import { useEffect, useState } from "react";
import { FALLBACK_PRODUCT_IMAGE } from "@/lib/constants";

interface ProductImageSlideshowProps {
  images?: string[] | null;
  alt?: string;
  className?: string;
  intervalMs?: number;
  showDots?: boolean;
}

/**
 * Auto-rotating product image slideshow.
 * - Single image: renders a static <img>.
 * - Multiple images: cross-fades between them on an interval, independent of page.
 */
export function ProductImageSlideshow({
  images,
  alt,
  className = "h-full w-full object-cover",
  intervalMs = 3000,
  showDots = false,
}: ProductImageSlideshowProps) {
  const list = (images && images.length > 0 ? images : [FALLBACK_PRODUCT_IMAGE]).filter(Boolean);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (list.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [list.length, intervalMs]);

  if (list.length <= 1) {
    return (
      <img
        src={list[0]}
        alt={alt}
        className={className}
        onError={(e) => ((e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE)}
      />
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {list.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={alt}
          className={`${className} absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          onError={(e) => ((e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE)}
        />
      ))}
      {showDots && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {list.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
