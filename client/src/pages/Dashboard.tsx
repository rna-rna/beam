import { useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Grid, Image as ImageIcon } from "lucide-react";
import { AnimatedLayout } from "@/components/AnimatedLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Gallery } from "@db/schema";

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useClerk();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query galleries
  const { data: galleries = [], isLoading } = useQuery<Gallery[]>({
    queryKey: ['/api/galleries'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/galleries', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch galleries');
      return res.json();
    },
    enabled: !!user,
  });

  // Create gallery mutation
  const createGalleryMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/galleries/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to create gallery');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
      setLocation(`/g/${data.slug}`);
      toast({
        title: "Success",
        description: "New gallery created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create gallery. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <AnimatedLayout title="My Galleries">
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <Card className="group hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <Button 
                variant="ghost" 
                className="w-full h-full aspect-video flex flex-col items-center justify-center gap-4 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 transition-colors"
                onClick={() => createGalleryMutation.mutate()}
                disabled={createGalleryMutation.isPending}
              >
                <Plus className="h-8 w-8" />
                <span className="text-sm font-medium">Create New Gallery</span>
              </Button>
            </CardContent>
          </Card>

          {galleries.map((gallery) => (
            <Card 
              key={gallery.id}
              className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              onClick={() => setLocation(`/g/${gallery.slug}`)}
            >
              <CardHeader className="pb-4">
                <CardTitle className="line-clamp-1">{gallery.title}</CardTitle>
                <CardDescription>
                  Created {new Date(gallery.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full">
                  <Grid className="mr-2 h-4 w-4" />
                  View Gallery
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </AnimatedLayout>
  );
}