'use client'

import { useState } from 'react'
import { Folder, Image, Plus, Search, ChevronDown, Menu, Trash2, FileText, Clock } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

// Mock data for folders and galleries
const folders = [
  { id: 1, name: 'Landscapes' },
  { id: 2, name: 'Portraits' },
  { id: 3, name: 'Events' },
]

const galleries = [
  { id: 1, title: 'Summer Vacation', imageCount: 24, thumbnail: '/placeholder.svg' },
  { id: 2, title: 'Wedding Shoot', imageCount: 156, thumbnail: '/placeholder.svg' },
  { id: 3, title: 'City Nightscapes', imageCount: 42, thumbnail: '/placeholder.svg' },
]

const drafts = [
  { id: 1, title: 'New Project', imageCount: 5, thumbnail: '/placeholder.svg' },
  { id: 2, title: 'Client Proofs', imageCount: 18, thumbnail: '/placeholder.svg' },
]

const recentGalleries = [
  { id: 1, title: 'Beach Sunset', imageCount: 12, thumbnail: '/placeholder.svg' },
  { id: 2, title: 'Mountain Hike', imageCount: 36, thumbnail: '/placeholder.svg' },
]

type Section = 'folders' | 'drafts' | 'recents' | 'trash'

export default function DashboardPage() {
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null)
  const [selectedSection, setSelectedSection] = useState<Section>('folders')
  const [sortOrder, setSortOrder] = useState('created')

  const renderGalleries = () => {
    let items = []
    switch (selectedSection) {
      case 'folders':
        items = galleries
        break
      case 'drafts':
        items = drafts
        break
      case 'recents':
        items = recentGalleries
        break
      case 'trash':
        items = [] // Assume trash is empty for this example
        break
    }

    if (items.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No items found</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg overflow-hidden">
            <img src={item.thumbnail || "/placeholder.svg"} alt={item.title} className="w-full h-40 object-cover" />
            <div className="p-4">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.imageCount} images</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderSidebar = () => (
    <ScrollArea className="flex-grow">
      <div className="p-4 space-y-4">
        <Button
          variant={selectedSection === 'recents' ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => setSelectedSection('recents')}
        >
          <Clock className="mr-2 h-4 w-4" />
          Recents
        </Button>
        <Button
          variant={selectedSection === 'drafts' ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => setSelectedSection('drafts')}
        >
          <FileText className="mr-2 h-4 w-4" />
          Drafts
        </Button>
        <Separator />
        <div className="font-semibold px-2">Folders</div>
        {folders.map((folder) => (
          <Button
            key={folder.id}
            variant={selectedFolder === folder.id && selectedSection === 'folders' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setSelectedFolder(folder.id)
              setSelectedSection('folders')
            }}
          >
            <Folder className="mr-2 h-4 w-4" />
            {folder.name}
          </Button>
        ))}
        <Separator />
        <Button
          variant={selectedSection === 'trash' ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => setSelectedSection('trash')}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Trash
        </Button>
      </div>
    </ScrollArea>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for larger screens */}
      <aside className="hidden md:flex w-64 flex-col border-r">
        {renderSidebar()}
        <div className="p-4 border-t">
          <Button className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add Folder
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                {renderSidebar()}
                <div className="p-4 border-t">
                  <Button className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add Folder
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Input
              type="search"
              placeholder="Search galleries..."
              className="ml-2 w-64"
            />
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Sort by <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setSortOrder('created')}>
                  Created Date
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortOrder('viewed')}>
                  Last Viewed
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortOrder('alphabetical')}>
                  Alphabetical
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Gallery
            </Button>
          </div>
        </header>
        <ScrollArea className="flex-1 p-4">
          {renderGalleries()}
        </ScrollArea>
      </main>
    </div>
  )
}

