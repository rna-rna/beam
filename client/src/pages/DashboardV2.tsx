
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { DashboardSidebarV2 } from "@/components/DashboardSidebarV2";
import { MainContentV2 } from "@/components/MainContentV2";
import { Loader2 } from "lucide-react";

export default function DashboardV2() {
  const { getToken } = useAuth();

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ['/api/galleries'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/galleries', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch galleries');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <MainContentV2 galleries={galleries} />
    </div>
  );
}
