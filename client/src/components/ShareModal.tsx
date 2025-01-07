import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, CheckCircle, Globe, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPublic: boolean;
  onVisibilityChange: (checked: boolean) => void;
  galleryUrl: string;
  slug: string;
}

export function ShareModal({ 
  isOpen, 
  onClose, 
  isPublic: initialIsPublic, 
  onVisibilityChange, 
  galleryUrl,
  slug 
}: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("View");
  const { toast } = useToast();

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!email) throw new Error("Email is required");

      const res = await fetch(`/api/galleries/${slug}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      });

      const result = await res.json();
      console.log('Invite API Response:', {
        status: res.status,
        ok: res.ok,
        data: result,
        timestamp: new Date().toISOString()
      });

      if (!res.ok) {
        throw new Error(result.message || "Failed to send invite");
      }
      if (!result.success) {
        throw new Error(result.message || "Failed to process invite");
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Invite sent",
        description: `Invitation sent to ${email}`,
      });
      setEmail("");
    },
    onError: (error) => {
      toast({
        title: "Failed to send invite",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(galleryUrl);
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
    onVisibilityChange(checked);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Gallery</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
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
              <Label>Share link</Label>
              <div className="flex space-x-2">
                <Input
                  value={galleryUrl}
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

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-input">Invite by email</Label>
              <Input
                id="email-input"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-select">Permission level</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Edit">Can edit</SelectItem>
                  <SelectItem value="Comment">Can comment</SelectItem>
                  <SelectItem value="View">Can view</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}