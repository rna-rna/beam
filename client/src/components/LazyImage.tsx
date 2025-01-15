
import LazyLoad from 'react-lazyload';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: number;
}

export function LazyImage({ src, alt, className, aspectRatio = 4/3, ...props }: LazyImageProps) {
  return (
    <div className="relative w-full">
      <LazyLoad 
        height={200}
        offset={100}
        placeholder={<Skeleton className={cn("w-full h-full absolute inset-0", className)} />}
      >
        <AspectRatio ratio={aspectRatio}>
          <img
            src={src}
            alt={alt}
            className={cn("lazy-image w-full h-full absolute inset-0", className)}
            style={{ objectFit: "cover" }}
            loading="lazy"
            onLoad={(e) => e.currentTarget.classList.add('loaded')}
            {...props}
          />
        </AspectRatio>
      </LazyLoad>
    </div>
  );
}
