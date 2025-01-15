
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@clerk/clerk-react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export default function NewGallery() {
  const [, setLocation] = useLocation();
  const { getToken } = useAuth();

  const createGalleryMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/galleries/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) throw new Error('Failed to create gallery');
      return res.json();
    },
    onSuccess: (data) => {
      setLocation(`/g/${data.slug}`);
    },
  });

  useEffect(() => {
    createGalleryMutation.mutate();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
