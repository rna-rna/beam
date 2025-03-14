
import { useState } from "react";
import dayjs from "dayjs";
import { useLocation } from "wouter";
import { Clock, FolderOpen, Share, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface GalleryCardProps {
  gallery: {
    id: number;
    slug: string;
    title: string;
    imageCount?: number;
    lastViewedAt?: string;
    isOwner?: boolean;
    sharedBy?: {
      firstName?: string;
      lastName?: string;
    };
    thumbnailUrl?: string;
  };
  isListView?: boolean;
  onShare?: (gallery: any) => void;
  onRename?: (gallery: any) => void;
  onDelete?: (gallery: any) => void;
}

export function GalleryCard({ 
  gallery, 
  isListView = false,
  onShare,
  onRename,
  onDelete
}: GalleryCardProps) {
  const [, setLocation] = useLocation();

  const handleShare = () => {
    if (onShare) onShare(gallery);
  };

  const handleRename = () => {
    if (onRename) onRename(gallery);
  };

  const handleDelete = () => {
    if (onDelete) onDelete(gallery);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card
          className={`${
            isListView
              ? "flex items-center gap-4 p-3"
              : "flex flex-col overflow-hidden"
          } cursor-pointer hover:border-primary/20 transition-colors`}
          onClick={() => setLocation(`/g/${gallery.slug}`)}
        >
          {!isListView && gallery.thumbnailUrl && (
            <div className="w-full aspect-video bg-muted">
              <img
                src={gallery.thumbnailUrl}
                alt={gallery.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className={`${isListView ? "flex-1" : "p-3"}`}>
            <div className={`${isListView ? "flex justify-between items-center" : ""}`}>
              <div>
                <h3 className="font-semibold text-lg">{gallery.title}</h3>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {gallery.imageCount || 0} images
                  </p>
                  {!gallery.lastViewedAt && !gallery.isOwner && (
                    <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      Invited
                    </span>
                  )}
                </div>
              </div>
              <div className={`${isListView ? 'flex items-center gap-8' : 'flex items-center justify-between mt-2'} text-xs text-muted-foreground`}>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {gallery.lastViewedAt ? dayjs(gallery.lastViewedAt).fromNow() : 'Never viewed'}
                </div>
                <span className="flex items-center gap-1">
                  {gallery.isOwner ? 'Owned by you' : `Shared by ${gallery.sharedBy?.firstName || ''} ${gallery.sharedBy?.lastName || ''}`}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => setLocation(`/g/${gallery.slug}`)}>
          <FolderOpen className="mr-2 h-4 w-4" /> Open
        </ContextMenuItem>
        <ContextMenuItem onClick={handleShare}>
          <Share className="mr-2 h-4 w-4" /> Share
        </ContextMenuItem>
        {gallery.isOwner && (
          <ContextMenuItem onClick={handleRename}>
            <Pencil className="mr-2 h-4 w-4" /> Rename
          </ContextMenuItem>
        )}
        {gallery.isOwner && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-red-600"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
