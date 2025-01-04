import { Users, Star } from "lucide-react"; // Added Star import
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

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
  const [selectAllTriggered, setSelectAllTriggered] = useState(false);

  const isAllSelected = users.length > 0 && users.every(user => 
    selectedUsers.includes(user.userId)
  );

  const toggleUser = (userId: string) => {
    const isCurrentlySelected = selectedUsers.includes(userId);
    const newSelection = isCurrentlySelected
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];

    if (selectAllTriggered) {
      setSelectAllTriggered(false);
    }

    onSelectionChange(newSelection);
  };

  const toggleAll = () => {
    const allSelected = users.length > 0 && users.every(user => selectedUsers.includes(user.userId));
    const newSelection = allSelected ? [] : users.map(u => u.userId);
    
    setSelectAllTriggered(!allSelected);
    onSelectionChange(newSelection);
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
        <div className="max-h-fit">
          <DropdownMenuCheckboxItem
            checked={selectAllTriggered}
            onCheckedChange={toggleAll}
            className="pl-2 pr-8"
          >
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              View all Stars
            </div>
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {users.map((user) => (
            <DropdownMenuCheckboxItem
              key={user.userId}
              checked={selectedUsers.includes(user.userId)}
              onCheckedChange={() => toggleUser(user.userId)}
            >
              <span className="flex items-center gap-2">
                {user.imageUrl ? <img src={user.imageUrl} alt={`${user.firstName} ${user.lastName} avatar`} className="h-6 w-6 rounded-full" /> : null} {/* Added mini avatar */}
                {user.firstName} {user.lastName}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
          {users.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectAllTriggered(false);
                    onSelectionChange([]);
                  }}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Reset Filters
                </Button>
              </div>
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}