import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  imageUrl?: string | null;
  color?: string | null;
  isActive?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeVariants = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return "?";
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
          style={{ backgroundColor: bgColor || "#ccc", color: "white" }}
          className="font-medium"
          data-color={bgColor}
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