
import { useRef, useEffect } from 'react';

function useIntersectionPreload(imageUrl: string, options: IntersectionObserverInit = {}) {
  const elementRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    console.log("useIntersectionPreload effect running for:", imageUrl, {
      hasRef: !!elementRef.current,
      refDetails: elementRef.current?.getBoundingClientRect?.(),
      timestamp: new Date().toISOString()
    });

    // If no ref element or no image url, bail early
    if (!elementRef.current || !imageUrl) {
      console.log("Hook bailing early:", {
        reason: !elementRef.current ? "Missing ref" : "Missing imageUrl",
        imageUrl,
        refExists: !!elementRef.current,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const currentElement = elementRef.current;
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      
      if (entry.isIntersecting) {
        console.log("Intersection triggered for URL:", imageUrl, {
          boundingRect: entry.boundingClientRect,
          intersectionRatio: entry.intersectionRatio,
          time: new Date().toISOString()
        });
        
        // Create new image and set source
        const img = new Image();
        img.src = imageUrl;
        
        // Log when image starts loading
        img.onloadstart = () => console.log("Image load started:", imageUrl);
        
        // Log when image finishes loading
        img.onload = () => console.log("Image load completed:", imageUrl);
        
        // Unobserve after detecting intersection
        observer.unobserve(currentElement);
      }
    }, {
      rootMargin: '200px',
      threshold: 0,
      ...options
    });

    // Start observing
    observer.observe(currentElement);
    console.log("Started observing element for:", imageUrl);

    // Cleanup
    return () => {
      console.log("Cleaning up observer for:", imageUrl);
      observer.disconnect();
    };
  }, [imageUrl, options]);

  return elementRef;
}

export { useIntersectionPreload };
