import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle, Globe, Lock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gallerySlug: string;
  isPublic: boolean;
}

export function ShareModal({ isOpen, onClose, gallerySlug, isPublic: initialIsPublic }: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const shareUrl = `${window.location.origin}/gallery/${gallerySlug}`;

  const toggleVisibilityMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      const token = await getToken();
      const res = await fetch(`/api/galleries/${gallerySlug}/visibility`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ isPublic }),
        credentials: "include"
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      return res.json();
    },
    onSuccess: () => {
      // Force cache invalidation for the specific gallery
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${gallerySlug}`] });
      toast({
        title: "Gallery visibility updated",
        description: `Gallery is now ${isPublic ? "public" : "private"}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update gallery visibility: ${error.message}`,
        variant: "destructive",
      });
      setIsPublic(!isPublic); // Revert the toggle
    },
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "Gallery link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleToggleVisibility = (checked: boolean) => {
    setIsPublic(checked);
    toggleVisibilityMutation.mutate(checked);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Gallery</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              {isPublic ? (
                <Globe className="w-4 h-4 text-green-500" />
              ) : (
                <Lock className="w-4 h-4 text-yellow-500" />
              )}
              <Label htmlFor="public-toggle">Make gallery public</Label>
            </div>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={handleToggleVisibility}
            />
          </div>

          {isPublic && (
            <div className="space-y-2">
              <Label htmlFor="share-link">Shareable link</Label>
              <div className="flex space-x-2">
                <Input
                  id="share-link"
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {!isPublic && (
            <p className="text-sm text-muted-foreground">
              Make this gallery public to share it with others
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}