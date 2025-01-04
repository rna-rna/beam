
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StarredUser {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

interface StarredUsersFilterProps {
  users: StarredUser[];
  selectedUsers: string[];
  onSelectionChange: (userIds: string[]) => void;
}

export function StarredUsersFilter({ 
  users, 
  selectedUsers, 
  onSelectionChange 
}: StarredUsersFilterProps) {
  const toggleUser = (userId: string) => {
    const isCurrentlySelected = selectedUsers.includes(userId);
    const newSelection = isCurrentlySelected
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];
    onSelectionChange(newSelection);
  };

  const isAllSelected = users.length > 0 && users.every(user => 
    selectedUsers.includes(user.userId)
  );
  
  const toggleAll = () => {
    onSelectionChange(isAllSelected ? [] : users.map(u => u.userId));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Users className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filter by Stars</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          <DropdownMenuCheckboxItem
            checked={isAllSelected}
            onCheckedChange={toggleAll}
          >
            Show Everyone
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {users.map((user) => (
            <DropdownMenuCheckboxItem
              key={user.userId}
              checked={selectedUsers.includes(user.userId)}
              onCheckedChange={() => toggleUser(user.userId)}
            >
              <span className="flex items-center gap-2">
                {user.firstName} {user.lastName}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
