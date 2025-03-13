import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { mixpanel } from '@/lib/analytics';

export default function NewGallery() {
  const [, setLocation] = useLocation();
  const { getToken } = useAuth();
  const { user } = useUser();

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
        },
        body: JSON.stringify({
          isDraft: true
        }),
      });
      if (!res.ok) throw new Error('Failed to create gallery');
      return res.json();
    },
    onSuccess: (data) => {
      // Track the "Gallery Created" event in Mixpanel
      mixpanel.track("Gallery Created", {
        gallery_id: data.id,
        gallery_slug: data.slug,
        is_draft: true
      });

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