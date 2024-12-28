import { useClerk, useUser } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronDown,
  User as UserIcon
} from "lucide-react";
import { motion } from "framer-motion";

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-8 w-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="User menu"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="h-8 w-8 flex items-center"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={user.imageUrl}
                alt={user.fullName || user.username || "User avatar"}
              />
              <AvatarFallback>
                <UserIcon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground" />
          </motion.div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end"
        forceMount
        asChild
      >
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="w-10"
        >
          <DropdownMenuItem 
            onClick={() => setLocation("/dashboard")}
            className="cursor-pointer p-2 flex items-center justify-center"
          >
            <LayoutDashboard className="h-4 w-4" />
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setLocation("/settings")}
            className="cursor-pointer p-2 flex items-center justify-center"
          >
            <Settings className="h-4 w-4" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleSignOut}
            className="cursor-pointer p-2 flex items-center justify-center text-red-600 focus:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </DropdownMenuItem>
        </motion.div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}