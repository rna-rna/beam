
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { debounce } from "lodash";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPublic: boolean;
  onVisibilityChange: (checked: boolean) => void;
  galleryUrl: string;
  slug: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
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
  const [userSuggestions, setUserSuggestions] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const lookupUser = debounce(async (query: string) => {
    if (!query || query.length < 3) {
      setUserSuggestions([]);
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`/api/users/search?email=${query}`);
      const data = await res.json();
      setUserSuggestions(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    lookupUser(email);
  }, [email]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setEmail(user.email);
    setUserSuggestions([]);
  };

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/galleries/${slug}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) throw new Error("Failed to send invite");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invite sent",
        description: `Invitation sent to ${email}`,
      });
      setEmail("");
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to send invite",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(galleryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link copied",
      description: "Gallery link copied to clipboard",
    });
  };

  const handleVisibilityChange = (checked: boolean) => {
    setIsPublic(checked);
    onVisibilityChange(checked);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Gallery</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              checked={isPublic}
              onCheckedChange={handleVisibilityChange}
              aria-label="Toggle gallery visibility"
            />
            <Label>Make gallery public</Label>
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
            <div className="relative">
              <Label htmlFor="email-input">Invite by email</Label>
              <Input
                id="email-input"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {loading && <p className="text-sm text-muted-foreground mt-2">Searching...</p>}

              {userSuggestions.length > 0 && (
                <div className="absolute z-10 bg-background border rounded-md shadow-md mt-2 w-full">
                  {userSuggestions.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted cursor-pointer"
                      onClick={() => handleSelectUser(user)}
                    >
                      <Avatar>
                        {user.avatarUrl ? (
                          <AvatarImage src={user.avatarUrl} />
                        ) : (
                          <AvatarFallback>{user.fullName[0]}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {email && !selectedUser && !loading && (
                <div className="flex items-center space-x-3 mt-4">
                  <Avatar>
                    <AvatarFallback>?</AvatarFallback>
                  </Avatar>
                  <p className="text-sm">Invite as new user</p>
                </div>
              )}
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
