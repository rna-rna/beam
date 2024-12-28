import { useState } from 'react'
import { Search, Filter, Grid, MoreVertical, Sun, Moon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface GalleryHeaderProps {
  selectedCount: number
  viewMode: 'grid' | 'masonry'
  setViewMode: (mode: 'grid' | 'masonry') => void
  selectionMode: 'none' | 'multiple'
  setSelectionMode: (mode: 'none' | 'multiple') => void
  onSort: (option: 'recent' | 'popular' | 'alphabetical') => void
  onSearch: (query: string) => void
  isDark: boolean
  toggleTheme: () => void
}

export function GalleryHeader({
  selectedCount,
  viewMode,
  setViewMode,
  selectionMode,
  setSelectionMode,
  onSort,
  onSearch,
  isDark,
  toggleTheme
}: GalleryHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-10 backdrop-blur-lg bg-background/50 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {searchOpen ? (
          <div className="flex-1 max-w-md">
            <Input
              type="search"
              placeholder="Search images..."
              className="w-full"
              onChange={(e) => onSearch(e.target.value)}
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        ) : (
          <h1 className="text-lg font-medium">
            {selectedCount > 0 
              ? `${selectedCount} selected`
              : 'Gallery'
            }
          </h1>
        )}

        <div className="flex items-center gap-2">
          {!searchOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="hover:bg-accent"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'masonry' : 'grid')}
            className="hover:bg-accent"
          >
            <Grid className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-accent">
                <Filter className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSort('recent')}>
                Most Recent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSort('popular')}>
                Most Popular
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSort('alphabetical')}>
                Alphabetical
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hover:bg-accent"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectionMode(selectionMode === 'none' ? 'multiple' : 'none')}
            className="hover:bg-accent"
          >
            <Check className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}