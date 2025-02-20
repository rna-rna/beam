
import { useRef, useEffect } from "react";

/**
 * A hook that returns a ref to attach to any element.
 * When that element scrolls into view, we execute the callback (e.g. preloading an image).
 *
 * @param callback A function that gets called once the element is in viewport
 * @param options IntersectionObserverInit (optional overrides)
 *
 * @returns a ref to attach to the DOM element
 */
export function useIntersectionPreload(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        // Execute callback once element is in the viewport
        callback();
        // If we only want it once, unobserve right away:
        observer.unobserve(entry.target);
      }
    }, options);

    observer.observe(ref.current);

    // Cleanup
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, callback, options]);

  return ref;
}
