
import { useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/Layout";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user, isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress || "");
  const [password, setPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await user?.update({
        firstName,
        lastName,
      });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    
    setIsChangingPassword(true);
    try {
      await clerk.updatePassword({ newPassword: password });
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      setPassword("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6">
      <Card className="max-w-2xl mx-auto p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Profile</h2>
            <div className="mb-6">
              <img
                src={user?.imageUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full"
              />
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  First Name
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Last Name
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Email (Primary)
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                />
              </div>

              <Button type="submit" disabled={isUpdating}>
                {isUpdating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Profile
              </Button>
            </form>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Security</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  New Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Change Password
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
