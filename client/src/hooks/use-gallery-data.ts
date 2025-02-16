
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Gallery, Image } from "@/types/gallery";
import { useToast } from "@/hooks/use-toast";

export function useGalleryData(slug?: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: gallery,
    isLoading,
    error
  } = useQuery<Gallery>({
    queryKey: [`/api/galleries/${slug}`],
    queryFn: async () => {
      const token = await getToken();
      const headers: HeadersInit = {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/galleries/${slug}`, {
        headers,
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("This gallery is private");
        if (res.status === 404) throw new Error("Private Gallery");
        throw new Error("Failed to fetch gallery");
      }

      return res.json();
    },
    enabled: !!slug,
  });

  const titleUpdateMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const token = await getToken();
      const res = await fetch(`/api/galleries/${slug}/title`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!res.ok) throw new Error("Failed to update title");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
      queryClient.invalidateQueries(["/api/galleries"]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update title. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async (checked: boolean) => {
      const token = await getToken();
      const res = await fetch(`/api/galleries/${slug}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic: checked }),
      });

      if (!res.ok) throw new Error("Failed to update visibility");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
      toast({
        title: "Success",
        description: "Gallery visibility updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update visibility. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    gallery,
    isLoading,
    error,
    titleUpdateMutation,
    toggleVisibilityMutation
  };
}
