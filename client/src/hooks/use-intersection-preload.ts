
import { useRef, useEffect } from 'react';

function useIntersectionPreload(imageUrl: string, options: IntersectionObserverInit = {}) {
  const elementRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const currentElement = elementRef.current;
    if (!currentElement || !imageUrl) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      
      if (entry.isIntersecting) {
        // Create new image and set source
        const img = new Image();
        img.src = imageUrl;
        
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
