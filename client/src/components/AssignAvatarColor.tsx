
import { useUser } from "@clerk/clerk-react";
import { getRandomColor } from "@/lib/avatarColor";

export const AssignAvatarColor = () => {
  const { user } = useUser();

  // Check if user already has an avatar color
  if (user && !user.publicMetadata.avatarColor) {
    const randomColor = getRandomColor();
    user.update({
      publicMetadata: {
        avatarColor: randomColor
      }
    });
    console.log("Assigned avatar color:", randomColor);
  }

  return null;
};
