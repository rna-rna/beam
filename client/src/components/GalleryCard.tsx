import { useDrag } from "react-dnd";

export function GalleryCard({ gallery, selected, onSelect }) {
  const [{ isDragging }, dragRef] = useDrag({
    type: "GALLERY",
    item: () => ({
      id: gallery.id,
      selectedIds: selected ? selectedGalleries : [gallery.id]
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div 
      ref={dragRef}
      className={cn(
        "relative group",
        isDragging && "opacity-50",
        selected && "ring-2 ring-primary"
      )}
    >
      {/* Existing card content */}
    </div>
  );
}