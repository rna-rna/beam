import { useQuery } from "@tanstack/react-query";
import Masonry from "react-masonry-css";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "wouter";

export default function Gallery() {
  const { id } = useParams();

  const { data: gallery, isLoading } = useQuery({
    queryKey: [`/api/galleries/${id}`],
  });

  const breakpointCols = {
    default: 4,
    1536: 3,
    1024: 2,
    640: 1
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Masonry
          breakpointCols={breakpointCols}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-background"
        >
          {[...Array(8)].map((_, i) => (
            <div key={i} className="mb-4">
              <Skeleton className="w-full h-[200px]" />
            </div>
          ))}
        </Masonry>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold text-foreground">
          Gallery not found
        </h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Masonry
        breakpointCols={breakpointCols}
        className="flex -ml-4 w-auto"
        columnClassName="pl-4 bg-background"
      >
        {gallery.images.map((image: any) => (
          <div key={image.id} className="mb-4">
            <AspectRatio ratio={image.aspectRatio}>
              <img
                src={image.url}
                alt=""
                className="w-full h-full object-cover rounded-md"
                loading="lazy"
              />
            </AspectRatio>
          </div>
        ))}
      </Masonry>
    </div>
  );
}
