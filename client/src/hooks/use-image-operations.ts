
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";

export function useImageOperations(slug: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleStarMutation = useMutation({
    mutationFn: async ({ imageId, isStarred }: { imageId: number; isStarred: boolean }) => {
      const token = await getToken();
      const res = await fetch(`/api/images/${imageId}/star`, {
        method: isStarred ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const result = await res.json();
      if (!res.ok || result?.success === false) {
        throw new Error(result.message || "Failed to update star status");
      }

      return { ...result, imageId };
    },
    onMutate: async ({ imageId, isStarred }) => {
      await queryClient.cancelQueries([`/api/galleries/${slug}`]);
      await queryClient.cancelQueries([`/api/images/${imageId}/stars`]);
      
      const previousGallery = queryClient.getQueryData([`/api/galleries/${slug}`]);
      const previousStars = queryClient.getQueryData([`/api/images/${imageId}/stars`]);

      queryClient.setQueryData([`/api/galleries/${slug}`], (oldData: any) => ({
        ...oldData,
        images: oldData.images.map((image: any) =>
          image.id === imageId ? { ...image, userStarred: !isStarred } : image
        ),
      }));

      return { previousGallery, previousStars };
    },
    onError: (err, variables, context) => {
      if (context?.previousGallery) {
        queryClient.setQueryData([`/api/galleries/${slug}`], context.previousGallery);
      }
      toast({
        title: "Error",
        description: "Failed to update star status. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
    },
  });

  const deleteImagesMutation = useMutation({
    mutationFn: async (imageIds: number[]) => {
      const response = await fetch(`/api/galleries/${slug}/images/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds }),
      });
      if (!response.ok) throw new Error("Failed to delete images");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData([`/api/galleries/${slug}`], (oldData: any) => ({
        ...oldData,
        images: oldData.images.filter((image: any) => !variables.includes(image.id)),
      }));

      toast({
        title: "Success",
        description: "Selected images deleted successfully",
      });

      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete images. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reorderImageMutation = useMutation({
    mutationFn: async (newOrder: number[]) => {
      const res = await fetch(`/api/galleries/${slug}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newOrder }),
      });
      if (!res.ok) throw new Error("Failed to reorder images");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
      toast({
        title: "Success",
        description: "Image order updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update image order. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    toggleStarMutation,
    deleteImagesMutation,
    reorderImageMutation
  };
}
