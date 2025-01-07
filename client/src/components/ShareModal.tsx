
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Copy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryUrl: string;
  slug: string;
  isPublic: boolean;
  onVisibilityChange: (checked: boolean) => void;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: string;
}

export function ShareModal({ isOpen, onClose, galleryUrl, slug, isPublic, onVisibilityChange }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [userSuggestions, setUserSuggestions] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [linkPermission, setLinkPermission] = useState(isPublic ? "view" : "none");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Update link permission when public status changes
  useEffect(() => {
    setLinkPermission(isPublic ? "view" : "none");
  }, [isPublic]);

  // User lookup with debounce
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (email.length < 3) {
        setUserSuggestions([]);
        return;
      }

      try {
        const res = await fetch(`/api/users/search?email=${email}`);
        const data = await res.json();
        if (data.success) {
          setUserSuggestions(data.users || []);
        }
      } catch (error) {
        console.error("User lookup failed:", error);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [email]);

  // Handle link permission change
  const handleLinkPermissionChange = (value: string) => {
    setLinkPermission(value);
    onVisibilityChange(value !== "none");
  };

  // Handle user selection
  const handleSelectUser = (user: User) => {
    setSelectedUsers((prev) => [...prev, { ...user, role: "View" }]);
    setEmail("");
    setUserSuggestions([]);
  };

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/galleries/${slug}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedUsers.find(u => u.id === userId)?.email,
          role: newRole
        }),
      });

      if (!res.ok) throw new Error("Failed to update role");

      setSelectedUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update role. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle send invites
  const handleSendInvite = async () => {
    if (!email) return;

    try {
      const res = await fetch(`/api/galleries/${slug}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role: "View"
        }),
      });

      if (!res.ok) throw new Error("Failed to send invite");

      toast({
        title: "Success",
        description: "Invite sent successfully",
      });

      setEmail("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invite. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(galleryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Success",
      description: "Link copied to clipboard",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Gallery</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Link Permission */}
          <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
            <p>Anyone with the link</p>
            <Select
              value={linkPermission}
              onValueChange={handleLinkPermissionChange}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Can view</SelectItem>
                <SelectItem value="none">Restricted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label>Add people</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={handleSendInvite}>Send</Button>
            </div>
            
            {/* User Suggestions */}
            {userSuggestions.length > 0 && (
              <div className="mt-1 p-1 bg-background border rounded-lg shadow-sm">
                {userSuggestions.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 p-2 hover:bg-secondary/50 rounded-md cursor-pointer"
                    onClick={() => handleSelectUser(user)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{user.fullName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Users */}
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-2 bg-secondary/20 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user.fullName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Select
                value={user.role}
                onValueChange={(role) => handleRoleChange(user.id, role)}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="View">Viewer</SelectItem>
                  <SelectItem value="Comment">Commenter</SelectItem>
                  <SelectItem value="Edit">Editor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Copy Link Button */}
          <div className="flex justify-end">
            <Button onClick={handleCopyLink} variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copied!" : "Copy link"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
