import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Masonry from "react-masonry-css";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useParams } from "wouter";
import { X } from "lucide-react";

export default function Gallery() {
  const { slug } = useParams();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: gallery, isLoading } = useQuery<{ images: any[] }>({
    queryKey: [`/api/galleries/${slug}`],
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
              <Skeleton className="w-full h-48 md:h-64 lg:h-80" />
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
    <>
      <div className="container mx-auto px-4 py-8">
        <Masonry
          breakpointCols={breakpointCols}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-background"
        >
          {gallery.images.map((image: any) => (
            <div 
              key={image.id} 
              className="mb-4 cursor-pointer transition-transform hover:scale-[1.02]"
              onClick={() => setSelectedImage(image.url)}
            >
              <img
                src={image.url}
                alt=""
                className="w-full h-auto object-contain rounded-md"
                loading="lazy"
              />
            </div>
          ))}
        </Masonry>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-background/95 backdrop-blur border-none">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-6 w-6 text-white" />
            <span className="sr-only">Close</span>
          </button>
          {selectedImage && (
            <img
              src={selectedImage}
              alt=""
              className="w-full h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
