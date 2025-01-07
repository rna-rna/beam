
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<User[]>([]);
  const [linkPermission, setLinkPermission] = useState(isPublic ? "view" : "none");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(`/api/galleries/${slug}/permissions`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setInvitedUsers(data.users || []);
          } else {
            toast({
              title: "Error",
              description: "Failed to fetch permissions",
              variant: "destructive",
            });
          }
        })
        .catch(() => {
          console.error("Failed to load existing permissions");
          toast({
            title: "Error", 
            description: "Could not load user permissions",
            variant: "destructive",
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, slug, toast]);

  useEffect(() => {
    setLinkPermission(isPublic ? "view" : "none");
  }, [isPublic]);

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

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setEmail("");
    setUserSuggestions([]);
  };

  const handleSendInvite = async () => {
    // Handle both selected user and direct email cases
    const emailToInvite = selectedUser ? selectedUser.email : email;
    if (!emailToInvite) return;

    try {
      const res = await fetch(`/api/galleries/${slug}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToInvite,
          role: "View",
        }),
      });

      if (!res.ok) throw new Error("Failed to send invite");

      toast({
        title: "Success",
        description: `Invite sent to ${emailToInvite}`,
      });

      // Create a new user object for direct email invites
      const newUser = selectedUser || {
        id: emailToInvite,
        email: emailToInvite,
        fullName: emailToInvite.split('@')[0],
        role: "View"
      };

      setInvitedUsers((prev) => [...prev, { ...newUser, role: "View" }]);
      setSelectedUser(null);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Gallery</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center justify-center mt-4">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.2s] mx-1"></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.4s]"></span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
            <p>Anyone with the link</p>
            <Select
              value={linkPermission}
              onValueChange={(value) => {
                setLinkPermission(value);
                onVisibilityChange(value !== "none");
              }}
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

          <div className="space-y-2">
            <Label>Add people</Label>
            <div className="relative">
              <div className="flex gap-2 items-center">
                {selectedUser ? (
                  <div className="flex-1 flex items-center space-x-2 px-3 py-1.5 bg-secondary/50 rounded-full">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedUser.avatarUrl || undefined} />
                      <AvatarFallback>{selectedUser.fullName[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm">{selectedUser.email}</p>
                    <button 
                      onClick={() => setSelectedUser(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                  />
                )}
                <Button 
                  onClick={handleSendInvite} 
                  disabled={!selectedUser && !isValidEmail(email)}
                >
                  Invite
                </Button>
              </div>
              
              {!selectedUser && email.length >= 3 && !userSuggestions.length && (
                <div className="absolute left-0 right-0 mt-1">
                  <div className="flex items-center justify-center mt-4">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.2s] mx-1"></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.4s]"></span>
                  </div>
                </div>
              )}
              {userSuggestions.length > 0 && !selectedUser && (
                <div className="absolute left-0 right-0 mt-1 p-1 bg-background border rounded-lg shadow-lg z-50">
                  {userSuggestions.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2 hover:bg-secondary/50 rounded cursor-pointer"
                      onClick={() => handleSelectUser(user)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl || undefined} />
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
          </div>

          {invitedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-2 bg-secondary/20 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback>{user.fullName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              {user.id === 'owner' ? (
                <p className="text-sm font-medium text-muted-foreground">Owner</p>
              ) : (
                <Select
                  value={user.role}
                  onValueChange={async (newRole) => {
                    // Store previous state for potential rollback
                    const previousUsers = [...invitedUsers];

                    // Optimistically update UI
                    setInvitedUsers(prev =>
                      prev.map(u => u.id === user.id ? { ...u, role: newRole } : u)
                    );

                    try {
                      const res = await fetch(`/api/galleries/${slug}/invite`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email: user.email,
                          role: newRole,
                        }),
                      });

                      const data = await res.json();

                      if (!res.ok || data.message !== "Invite sent successfully") {
                        throw new Error(data.message || "Failed to update role");
                      }

                      toast({
                        title: "Success",
                        description: "Role updated successfully"
                      });
                    } catch (error) {
                      // Rollback to previous state
                      setInvitedUsers(previousUsers);
                      
                      toast({
                        title: "Error",
                        description: "Failed to update role. Changes were reverted.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="View">Viewer</SelectItem>
                    <SelectItem value="Comment">Commenter</SelectItem>
                    <SelectItem value="Editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}

          <div className="flex justify-end">
                <Button onClick={handleCopyLink} variant="outline" className="gap-2">
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied!" : "Copy link"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
