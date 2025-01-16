
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { MainContent } from "@/components/MainContent";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default function Dashboard() {
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
    <div className="flex h-full">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <MainContent />
      </div>
    </div>
  );
}
