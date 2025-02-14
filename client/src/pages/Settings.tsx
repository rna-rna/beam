
import { useState, FormEvent } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user, isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const { toast } = useToast();

  // Profile info
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress || "");

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Avatar upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Loading states
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
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
      setIsUpdatingProfile(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setIsUploadingAvatar(true);

    try {
      await user?.setProfileImage({ file: avatarFile });
      toast({
        title: "Avatar updated",
        description: "Your profile image has been updated successfully.",
      });
      setAvatarFile(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) {
      return toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
    }
    if (newPassword !== confirmPassword) {
      return toast({
        title: "Error",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
    }

    setIsChangingPassword(true);
    try {
      await clerk.updatePassword({ newPassword });
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      setNewPassword("");
      setConfirmPassword("");
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
      <Card className="max-w-2xl mx-auto p-6 space-y-10">
        <div>
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          <div className="flex items-center space-x-4 mb-6">
            <img
              src={user?.imageUrl}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover"
            />
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setAvatarFile(e.target.files[0]);
                  }
                }}
              />
              <Button
                variant="secondary"
                className="mt-2"
                onClick={handleAvatarUpload}
                disabled={isUploadingAvatar || !avatarFile}
              >
                {isUploadingAvatar && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Upload Avatar
              </Button>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">First Name</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Last Name</label>
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
              <Input value={email} disabled />
            </div>

            <Button type="submit" disabled={isUpdatingProfile}>
              {isUpdatingProfile && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Profile
            </Button>
          </form>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Security</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Confirm New Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
      </Card>
    </div>
  );
}
