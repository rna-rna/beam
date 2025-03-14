import { useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { GalleryCard } from "@/components/GalleryCard";
import { useState, useEffect, useRef } from "react";
import { ShareModal } from "@/components/ShareModal";
import { RenameGalleryModal } from "@/components/RenameGalleryModal";
import { DeleteGalleryModal } from "@/components/DeleteGalleryModal";
import { DashboardHeader } from "@/components/DashboardHeader";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Clock, FolderOpen, Image, Pencil, Plus, Share, Trash2 } from "lucide-react";
import { getR2Image } from "@/lib/r2";
import * as ReactDOM from "react-dom/client";

export default function RecentsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListView, setIsListView] = useState(false);

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ['/api/recent-galleries'],
    queryFn: async () => {
      const res = await fetch('/api/recent-galleries');
      if (!res.ok) {
        throw new Error('Failed to fetch recent galleries');
      }
      return res.json();
    },
    refetchInterval: 30000
  });

  const filteredGalleries = galleries.filter(gallery => {
    return gallery.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleShare = (gallery) => {
    const url = `${window.location.origin}/g/${gallery.slug}`;
    const modal = document.createElement("div");
    modal.id = `share-modal-${gallery.id}`;
    document.body.appendChild(modal);
    const root = ReactDOM.createRoot(modal);
    root.render(
      <Dialog open onOpenChange={() => {
        root.unmount();
        modal.remove();
      }}>
        <DialogContent>
          <ShareModal
            isOpen={true}
            onClose={() => {
              root.unmount();
              modal.remove();
            }}
            galleryUrl={url}
            slug={gallery.slug}
            isPublic={gallery.isPublic}
            onVisibilityChange={() => {}}
          />
        </DialogContent>
      </Dialog>
    );
  };

  const handleRename = (gallery) => {
    const modal = document.createElement("div");
    modal.id = `rename-modal-${gallery.id}`;
    document.body.appendChild(modal);
    const root = ReactDOM.createRoot(modal);
    root.render(
      <Dialog open onOpenChange={() => {
        root.unmount();
        modal.remove();
      }}>
        <DialogContent>
          <RenameGalleryModal
            isOpen={true}
            onClose={() => {
              root.unmount();
              modal.remove();
            }}
            galleryId={gallery.id}
            initialTitle={gallery.title}
          />
        </DialogContent>
      </Dialog>
    );
  };

  const handleDelete = (gallery) => {
    const modal = document.createElement("div");
    modal.id = `delete-modal-${gallery.id}`;
    document.body.appendChild(modal);
    const root = ReactDOM.createRoot(modal);
    root.render(
      <Dialog open onOpenChange={() => {
        root.unmount();
        modal.remove();
      }}>
        <DialogContent>
          <DeleteGalleryModal
            isOpen={true}
            onClose={() => {
              root.unmount();
              modal.remove();
            }}
            galleryId={gallery.id}
            galleryTitle={gallery.title}
          />
        </DialogContent>
      </Dialog>
    );
  };

  dayjs.extend(relativeTime);

  return (
    <>
      <DashboardHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isListView={isListView}
        setIsListView={setIsListView}
        searchPlaceholder="Search recent galleries..."
        showNewGalleryButton={true}
      />
      <div className="p-4">
        <div className="text-xl font-bold mb-4">Recent Galleries</div>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredGalleries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent galleries found. Create your first gallery!
          </div>
        ) : (
          <div className={isListView ? "space-y-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"}>
            {filteredGalleries.map((gallery) => (
              <GalleryCard
                key={gallery.id}
                gallery={gallery}
                isListView={isListView}
                onShare={handleShare}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}