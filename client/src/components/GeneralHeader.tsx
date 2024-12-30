import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "./UserNav";
import { Link } from "wouter";

export function GeneralHeader() {
  const { user } = useUser();

  return (
    <div className="sticky top-0 z-50 bg-white shadow flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-xl font-bold">
          PhotoGalleryApp
        </Link>
      </div>

      <div className="flex items-center gap-6">
        {user ? (
          <UserNav />
        ) : (
          <div className="flex gap-4">
            <Link href="/sign-in">
              <Button variant="outline">Log In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Sign Up</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
