import { useClerk, useUser } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { UserAvatar } from "@/components/UserAvatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { motion } from "framer-motion";

import { NotificationBell } from "./NotificationBell";

export function UserNav() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  return (
    <div className="flex items-center gap-2">
      <NotificationBell /> {/* Added NotificationBell here */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="relative h-8 w-8 rounded-full"
            aria-label="User menu"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="h-8 w-8"
            >
              <UserAvatar 
                imageUrl={user.imageUrl}
                name={user.fullName || user.username || ""}
                color={user.publicMetadata?.color as string}
                className="h-8 w-8"
              />
            </motion.div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-56" 
          align="end"
          forceMount
          asChild
        >
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user.fullName || user.username}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setLocation("/dashboard")}
              className="cursor-pointer"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setLocation("/settings")}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </motion.div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}