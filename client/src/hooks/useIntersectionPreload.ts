
import { useRef, useEffect, useCallback } from "react";

export function useIntersectionPreload(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (!ref.current || hasPreloaded.current) return;

    // Cleanup previous observer if it exists
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !hasPreloaded.current) {
        callback();
        hasPreloaded.current = true;
        if (ref.current) {
          observerRef.current?.unobserve(ref.current);
        }
      }
    }, options);

    observerRef.current.observe(ref.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback, options]);

  return ref;
}
