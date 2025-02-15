
import { useState, FormEvent, useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type NotificationSettings = {
  invitesApp: boolean;
  invitesEmail: boolean;
  commentsApp: boolean;
  commentsEmail: boolean;
  starredApp: boolean;
  starredEmail: boolean;
};

export default function Settings() {
  const { user, isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      user.getSessions().then(setSessions).catch(console.error);
    }
  }, [user]);

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

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    invitesApp: false,
    invitesEmail: false,
    commentsApp: false,
    commentsEmail: false,
    starredApp: false,
    starredEmail: false,
  });

  // Loading states
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  useEffect(() => {
    if (user?.publicMetadata?.notifications) {
      setNotifications(user.publicMetadata.notifications as NotificationSettings);
    }
  }, [user]);

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
    if (newPassword !== confirmPassword) {
      return toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
    }
    setIsChangingPassword(true);
    try {
      await clerk.updatePassword({ newPassword });
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
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

  const handleNotificationUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setIsUpdatingNotifications(true);
    try {
      await user?.update({
        publicMetadata: {
          ...user.publicMetadata,
          notifications,
        },
      });
      toast({
        title: "Notifications updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to update notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingNotifications(false);
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
    <div className="container max-w-4xl py-8 mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account details and notification preferences
        </p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="account" className="flex-1">Account</TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="flex-1">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card className="p-6 space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-6">Profile</h2>
              <div className="flex items-center space-x-6 mb-6">
                <img
                  src={user?.imageUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setAvatarFile(e.target.files[0]);
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
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
                <div className="grid gap-4 md:grid-cols-2">
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
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Email (Primary)
                  </label>
                  <Input value={email} disabled className="bg-muted" />
                </div>

                <Button type="submit" disabled={isUpdatingProfile} className="w-full md:w-auto">
                  {isUpdatingProfile && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Profile
                </Button>
              </form>
            </div>

            
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
            <form onSubmit={handleNotificationUpdate} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">New Invites</h3>
                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={notifications.invitesApp}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            invitesApp: !!checked,
                          }))
                        }
                      />
                      <span className="text-sm">In-App</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={notifications.invitesEmail}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            invitesEmail: !!checked,
                          }))
                        }
                      />
                      <span className="text-sm">Email</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-4">Comments on Galleries</h3>
                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={notifications.commentsApp}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            commentsApp: !!checked,
                          }))
                        }
                      />
                      <span className="text-sm">In-App</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={notifications.commentsEmail}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            commentsEmail: !!checked,
                          }))
                        }
                      />
                      <span className="text-sm">Email</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-4">Starred Images</h3>
                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={notifications.starredApp}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            starredApp: !!checked,
                          }))
                        }
                      />
                      <span className="text-sm">In-App</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={notifications.starredEmail}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            starredEmail: !!checked,
                          }))
                        }
                      />
                      <span className="text-sm">Email</span>
                    </label>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isUpdatingNotifications}
                className="w-full md:w-auto"
              >
                {isUpdatingNotifications && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Notification Preferences
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="p-6 space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-6">Change Password</h2>
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
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" disabled={isChangingPassword} className="w-full md:w-auto">
                  {isChangingPassword && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Change Password
                </Button>
              </form>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-6">Session Management</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Active Sessions</h3>
                <div className="space-y-4">
                  {!isLoaded ? (
                    <div className="text-muted-foreground">Loading sessions...</div>
                  ) : sessions.length === 0 ? (
                    <div className="text-muted-foreground">No active sessions found</div>
                  ) : sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">
                          {session.latestActivity?.deviceType || "Unknown Device"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          IP: {session.latestActivity?.ipAddress || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last active:{" "}
                          {new Date(session.lastActiveAt).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Location: {session.latestActivity?.geolocation?.city && session.latestActivity?.geolocation?.country ? 
                            `${session.latestActivity.geolocation.city}, ${session.latestActivity.geolocation.country}` : 
                            (session.latestActivity?.geolocation?.country || "Location not available")}
                        </p>
                      </div>
                      {session.id !== user.primarySessionId && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            try {
                              await session.revoke();
                              toast({
                                title: "Session revoked",
                                description: "The session has been logged out successfully.",
                              });
                            } catch (err) {
                              toast({
                                title: "Error",
                                description: "Failed to revoke session. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-medium mb-4">Bulk Actions</h3>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await user?.signOutOfOtherSessions();
                      toast({
                        title: "Sessions revoked",
                        description: "All other sessions have been logged out.",
                      });
                    } catch (err) {
                      toast({
                        title: "Error",
                        description: "Failed to revoke sessions. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Sign out of all other sessions
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
