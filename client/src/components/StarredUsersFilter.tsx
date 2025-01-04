import { Users, Star } from "lucide-react";
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
import { useState, useEffect } from "react";

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
  
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(prev => !prev);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" data-filter-trigger>
          <Users className="h-7 w-7" /> {/* Changed icon size here */}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Star className="h-4 w-4" />
          Filter
          <div className="ml-auto inline-flex items-center gap-1">
            <kbd className="inline-flex h-5 select-none items-center rounded border px-1.5 font-mono text-[10px] font-medium">
              ⌘
            </kbd>
            <kbd className="inline-flex h-5 select-none items-center rounded border px-1.5 font-mono text-[10px] font-medium">
              F
            </kbd>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-fit">
          <DropdownMenuCheckboxItem
            checked={selectAllTriggered}
            onCheckedChange={toggleAll}
          >
            View all Stars
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
                  disabled={selectedUsers.length === 0 && !selectAllTriggered}
                  className="w-full text-muted-foreground hover:text-foreground disabled:opacity-50"
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