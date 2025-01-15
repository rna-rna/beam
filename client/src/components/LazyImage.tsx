
import LazyLoad from 'react-lazyload';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

export function LazyImage({ src, alt, className, ...props }: LazyImageProps) {
  return (
    <LazyLoad 
      height={200}
      offset={100}
      placeholder={<Skeleton className={cn("w-full h-full", className)} />}
    >
      <img
        src={src}
        alt={alt}
        className={cn("lazy-image", className)}
        loading="lazy"
        onLoad={(e) => e.currentTarget.classList.add('loaded')}
        {...props}
      />
    </LazyLoad>
  );
}
