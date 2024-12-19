import { useState } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export function LazyImage({ 
  src, 
  alt = "", 
  className,
  fallback,
  ...props 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const { targetRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
  });

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };

  return (
    <div 
      ref={targetRef as React.RefObject<HTMLDivElement>}
      className="relative w-full h-full"
    >
      {(!isLoaded || !isIntersecting) && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      {isIntersecting && !error && (
        <img
          src={src}
          alt={alt}
          className={cn(
            className,
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          {...props}
        />
      )}
      {error && fallback}
    </div>
  );
}
