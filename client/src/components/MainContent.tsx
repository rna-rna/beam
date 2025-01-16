import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { useLocation } from "wouter";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, FolderPlus, Clock, Image as ImageIcon, Share, Pencil, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { CustomDragLayer } from "./CustomDragLayer";

export function MainContent() {
  const [location, setLocation] = useLocation();
  const [selectedGalleries, setSelectedGalleries] = useState<number[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState("created");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState<number | null>(null);
  const params = new URLSearchParams(location.split("?")[1] || "");
  const folderParam = params.get("folder");
  const currentFolder = folderParam ? parseInt(folderParam, 10) : null;
  const queryClient = useQueryClient();

  const { data: folders = [] } = useQuery({
    queryKey: ["/api/folders"],
    queryFn: async () => {
      const res = await fetch("/api/folders");
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    }
  });

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ["/api/galleries"],
    queryFn: async () => {
      const res = await fetch("/api/galleries");
      if (!res.ok) throw new Error("Failed to fetch galleries");
      return res.json();
    },
  });

  // Debug logging
  console.log({
    location,
    folderParam,
    currentFolder,
    displayedGalleries: galleries?.filter(g => g.folderId === currentFolder)
  });

  const sortedGalleries = [...(galleries || [])].sort((a, b) => {
    if (sortOrder === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortOrder === "lastViewed") {
      const bTime = b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0;
      const aTime = a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0;
      if (bTime === 0 && aTime === 0) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return bTime - aTime;
    }
    if (sortOrder === "alphabetical") return a.title.localeCompare(b.title);
    return 0;
  });

  const displayedGalleries = currentFolder
    ? sortedGalleries.filter((gallery) => gallery.folderId === currentFolder)
    : sortedGalleries;



  const [{ isOver }, dropRef] = useDrop({
    accept: "GALLERY",
    drop: (item: { selectedIds: number[] }) => {
      if (currentFolder) {
        handleMoveGallery(item.selectedIds, currentFolder);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  const handleMoveGallery = async (galleryIds: number[], folderId: number) => {
    try {
      await Promise.all(galleryIds.map(async (galleryId) => {
        const res = await fetch(`/api/galleries/${galleryId}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId })
        });

        if (!res.ok) throw new Error('Failed to move gallery');
      }));
      await queryClient.invalidateQueries(['/api/galleries']);
    } catch (error) {
      console.error('Failed to move gallery:', error);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse">Loading galleries...</div>
        </div>
      );
    }

    return (
      <DndProvider backend={HTML5Backend}>
        <div className="flex h-full relative">
          <CustomDragLayer />
          <div className="flex-1 p-6">
            <div className="flex justify-end mb-6">
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Created Date</SelectItem>
                  <SelectItem value="lastViewed">Last Viewed</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {displayedGalleries.length === 0 ? (
              <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center text-muted-foreground">
                  <FolderPlus className="w-12 h-12 mx-auto mb-4" />
                  <p>This folder is empty</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedGalleries.map((gallery) => {
                  const [{ isDragging }, dragRef] = useDrag(() => ({
                    type: "GALLERY",
                    canDrag: () => selectedGalleries.includes(gallery.id) || selectedGalleries.length === 0,
                    item: () => ({
                      selectedIds: selectedGalleries.includes(gallery.id) ? selectedGalleries : [gallery.id]
                    }),
                    collect: (monitor) => ({
                      isDragging: monitor.isDragging(),
                    }),
                    options: {
                      dropEffect: 'move',
                      dragPreviewOptions: { 
                        captureDraggingState: true,
                        offsetX: 0,
                        offsetY: 0
                      }
                    }
                  }), [selectedGalleries]);

                  return (
                    <ContextMenu>
                      <ContextMenuTrigger>
                        <Card
                          ref={dragRef}
                          key={gallery.id}
                          onClick={(e) => {
                        if (!e.shiftKey) {
                          setSelectedGalleries([gallery.id]);
                          setLastSelectedId(gallery.id);
                        } else if (lastSelectedId) {
                          const galleries = sortedGalleries;
                          const currentIndex = galleries.findIndex(g => g.id === gallery.id);
                          const lastIndex = galleries.findIndex(g => g.id === lastSelectedId);
                          const [start, end] = [Math.min(currentIndex, lastIndex), Math.max(currentIndex, lastIndex)];
                          const rangeIds = galleries.slice(start, end + 1).map(g => g.id);
                          setSelectedGalleries(rangeIds);
                        } else {
                          setSelectedGalleries(prev =>
                            prev.includes(gallery.id)
                              ? prev.filter(id => id !== gallery.id)
                              : [...prev, gallery.id]
                          );
                          setLastSelectedId(gallery.id);
                        }
                      }}
                      onDoubleClick={() => setLocation(`/g/${gallery.slug}`)}
                      className={cn(
                        "overflow-hidden transition-all duration-200 cursor-pointer",
                        isDragging && "opacity-50",
                        selectedGalleries.includes(gallery.id) && "outline outline-2 outline-blue-500 outline-offset-[-2px]",
                        "hover:shadow-lg"
                      )}
                    >
                      <div className="aspect-video relative bg-muted">
                        {gallery.thumbnailUrl ? (
                          <img
                            src={gallery.thumbnailUrl}
                            alt={gallery.title}
                            className="object-cover w-full h-full"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="w-12 h-12" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold">{gallery.title}</h3>
                        <p className="text-sm text-muted-foreground">{gallery.imageCount} images</p>
                      </div>
                    </Card>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onSelect={() => setLocation(`/g/${gallery.slug}`)}>
                          <FolderOpen className="mr-2 h-4 w-4" />
                          Open
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => {
                          // Trigger share modal via state
                          setShareModalOpen(true);
                          setSelectedGalleryId(gallery.id);
                        }}>
                          <Share className="mr-2 h-4 w-4" />
                          Share
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => {
                          // Trigger rename modal via state
                          setRenameModalOpen(true);
                          setSelectedGalleryId(gallery.id);
                        }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Rename
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onSelect={() => {
                            // Trigger delete modal via state
                            setDeleteModalOpen(true);
                            setSelectedGalleryId(gallery.id);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DndProvider>
    );
  };

  return renderContent();
}