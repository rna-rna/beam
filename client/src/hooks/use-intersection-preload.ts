
import { useRef, useEffect } from 'react';

function useIntersectionPreload(imageUrl: string, options: IntersectionObserverInit = {}) {
  const elementRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const currentElement = elementRef.current;
    if (!currentElement || !imageUrl) return;

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

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, [imageUrl, options]);

  return elementRef;
}

export { useIntersectionPreload };
