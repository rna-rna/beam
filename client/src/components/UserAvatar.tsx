import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  imageUrl?: string | null;
  color?: string | null;
  isActive?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeVariants = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

function getInitials(fullName: string): string {
  return (
    fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function isClerkDefaultUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("default_avatar") ||
    url.includes("clerk_assets") ||
    url.includes("ZGVmYXVsdC") // base64 chunk for "default"
  );
}

export function UserAvatar({
  name,
  imageUrl,
  color,
  isActive = false,
  className = "",
  size = 'md'
}: UserAvatarProps) {
  const initials = getInitials(name);
  const bgColor = color || "#ccc";  // fallback if DB has no color

  return (
    <div className="relative group">
      <Avatar className={cn(sizeVariants[size], className)}>
        {imageUrl && !isClerkDefaultUrl(imageUrl) ? (
          <AvatarImage src={imageUrl} alt={name} />
        ) : null}
        <AvatarFallback
          style={{ backgroundColor: bgColor, color: "white" }}
          className="font-medium"
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {isActive && (
        <span className="absolute bottom-[2px] right-[2px] block h-2 w-2 rounded-full bg-green-500 group-hover:translate-y-[-2px] transition-transform" />
      )}
    </div>
  );
}