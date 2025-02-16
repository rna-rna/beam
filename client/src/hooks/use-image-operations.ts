
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import type { ImageOrPending } from "@/types/gallery";

export function useImageOperations(slug?: string) {
  const [images, setImages] = useState<ImageOrPending[]>([]);
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadSingleFile = async (file: File, tmpId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/galleries/${slug}/images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: [
            {
              name: file.name,
              type: file.type,
              size: file.size,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("Failed to get upload URL");

      const { urls } = await response.json();
      const { signedUrl, publicUrl, imageId } = urls[0];

      setImages((prev) =>
        prev.map((img) =>
          img.id === tmpId
            ? {
                ...img,
                id: imageId,
                status: "uploading",
                progress: 0,
              }
            : img,
        ),
      );

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const progress = (ev.loaded / ev.total) * 100;
            setImages((prev) =>
              prev.map((img) =>
                img.id === imageId ? { ...img, progress } : img,
              ),
            );
          }
        };

        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = () => (xhr.status === 200 ? resolve() : reject());
        xhr.onerror = () => reject();
        xhr.send(file);
      });

      const img = new Image();
      img.onload = () => {
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? {
                  ...(img as any),
                  status: "finalizing",
                  progress: 100,
                }
              : img,
          ),
        );

        queryClient.invalidateQueries([`/api/galleries/${slug}`]);
      };
      img.src = publicUrl;

    } catch (error) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === tmpId
            ? { ...(img as any), status: "error", progress: 0 }
            : img,
        ),
      );
      console.error("Upload failed:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      acceptedFiles.forEach((file) => {
        const tmpId = nanoid();
        const localUrl = URL.createObjectURL(file);

        const imageEl = new Image();
        imageEl.onload = () => {
          const width = imageEl.naturalWidth;
          const height = imageEl.naturalHeight;

          const newItem: ImageOrPending = {
            id: tmpId,
            localUrl,
            status: "uploading",
            progress: 0,
            width,
            height,
          };

          setImages((prev) => [...prev, newItem]);
          uploadSingleFile(file, tmpId);
        };
        imageEl.src = localUrl;
      });
    },
    [uploadSingleFile],
  );

  return {
    images,
    setImages,
    onDrop
  };
}
