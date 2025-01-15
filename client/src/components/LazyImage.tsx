
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
    <div className="relative w-full">
      <LazyLoad 
        height={200}
        offset={100}
        placeholder={<Skeleton className={cn("w-full h-full absolute inset-0", className)} />}
      >
        <AspectRatio ratio={4/3}>
          <img
            src={src}
            alt={alt}
            className={cn("lazy-image w-full h-full object-cover absolute inset-0", className)}
            loading="lazy"
            onLoad={(e) => e.currentTarget.classList.add('loaded')}
            {...props}
          />
        </AspectRatio>
      </LazyLoad>
    </div>
  );
}
