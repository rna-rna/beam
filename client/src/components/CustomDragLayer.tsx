
import { useDragLayer } from "react-dnd";
import { Card } from "./ui/card";

function StackedPreviews({ count }: { count: number }) {
  return (
    <div className="relative w-32">
      {[...Array(Math.min(3, count))].map((_, i) => (
        <div
          key={i}
          className="absolute bg-background border rounded-lg shadow-sm w-32 h-24"
          style={{
            transform: `rotate(${i * 2}deg) translateY(${i * -2}px)`,
            zIndex: 3 - i,
          }}
        />
      ))}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-medium">
        {count} items
      </div>
    </div>
  );
}

function SinglePreview({ galleryId }: { galleryId: number }) {
  return (
    <Card className="w-32 h-24 overflow-hidden shadow-lg">
      <img
        src={`/api/galleries/${galleryId}/thumbnail`}
        alt="Preview"
        className="w-full h-full object-cover"
      />
    </Card>
  );
}

export function CustomDragLayer() {
  const { item, isDragging, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem() as { selectedIds: number[] },
    isDragging: monitor.isDragging(),
    currentOffset: monitor.getSourceClientOffset(),
  }));

  if (!isDragging || !currentOffset) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div 
        style={{ 
          transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`,
          transformOrigin: '0 0'
        }}
      >
        {item.selectedIds.length > 1 ? (
          <StackedPreviews count={item.selectedIds.length} />
        ) : (
          <SinglePreview galleryId={item.selectedIds[0]} />
        )}
      </div>
    </div>
  );
}
